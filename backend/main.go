package main

import (
	"context"
	"crypto/md5"
	"encoding/hex"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"blog-system/ent"
	"blog-system/ent/post"
	"blog-system/ent/tag"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	_ "github.com/mattn/go-sqlite3"
	"gopkg.in/yaml.v3"
)

type Config struct {
	JWTSecret string    `yaml:"jwt_secret"`
	Users     []User    `yaml:"users"`
}

type User struct {
	Username string `yaml:"username"`
	Password string `yaml:"password"`
}

var globalConfig *Config

func main() {
	// Load config
	data, err := os.ReadFile("config.yaml")
	if err != nil {
		log.Fatalf("failed to read config: %v", err)
	}
	var cfg Config
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		log.Fatalf("failed to parse config: %v", err)
	}
	globalConfig = &cfg

	client, err := ent.Open("sqlite3", "file:blog.db?_fk=true")
	if err != nil {
		log.Fatalf("failed to open database: %v", err)
	}
	defer client.Close()

	if err := client.Schema.Create(context.Background()); err != nil {
		log.Fatalf("failed creating schema resources: %v", err)
	}

	// Backfill thumbnails for existing posts
	backfillThumbnails(client)

	r := gin.Default()
	r.Use(corsMiddleware())

	r.GET("/api/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	api := r.Group("/api")
	{
		// Public: login
		api.POST("/login", loginHandler)

		// Public: read-only posts and tags
		api.GET("/posts", listPosts(client))
		api.GET("/posts/:id", getPost(client))
		api.GET("/tags", listTags(client))

		// Protected: write operations
		protected := api.Group("")
		protected.Use(authMiddleware())
		{
			protected.POST("/posts", createPost(client))
			protected.PUT("/posts/:id", updatePost(client))
			protected.DELETE("/posts/:id", deletePost(client))
			protected.POST("/tags", createTag(client))
			protected.DELETE("/tags/:id", deleteTag(client))
		}
	}

	r.Run(":55999")
}

func loginHandler(c *gin.Context) {
	var input struct {
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "username and password required"})
		return
	}

	// Find user in config
	var matchedUser *User
	for _, u := range globalConfig.Users {
		if u.Username == input.Username && u.Password == input.Password {
			matchedUser = &u
			break
		}
	}
	if matchedUser == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}

	// Generate JWT
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"username": matchedUser.Username,
		"exp":      time.Now().Add(24 * time.Hour).Unix(),
	})
	tokenStr, err := token.SignedString([]byte(globalConfig.JWTSecret))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"token": tokenStr})
}

func authMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "authorization header required"})
			c.Abort()
			return
		}
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid authorization header format"})
			c.Abort()
			return
		}
		tokenStr := parts[1]
		token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return []byte(globalConfig.JWTSecret), nil
		})
		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			c.Abort()
			return
		}
		if claims, ok := token.Claims.(jwt.MapClaims); ok {
			c.Set("username", claims["username"])
		}
		c.Next()
	}
}

func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}

func listPosts(client *ent.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		query := client.Post.Query()

		// Keyword search in title and content
		if keyword := c.Query("keyword"); keyword != "" {
			query = query.Where(
				post.Or(
					post.TitleContains(keyword),
					post.ContentContains(keyword),
				),
			)
		}

		// Tag filter
		if tagName := c.Query("tag"); tagName != "" {
			query = query.Where(post.HasTagsWith(tag.Name(tagName)))
		}

		// Count total before pagination
		total, err := query.Count(context.Background())
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// Pagination
		page := 1
		pageSize := 10
		if p := c.Query("page"); p != "" {
			if parsed, err := strconv.Atoi(p); err == nil && parsed > 0 {
				page = parsed
			}
		}
		if ps := c.Query("page_size"); ps != "" {
			if parsed, err := strconv.Atoi(ps); err == nil && parsed > 0 && parsed <= 100 {
				pageSize = parsed
			}
		}
		offset := (page - 1) * pageSize

		posts, err := query.Order(ent.Desc(post.FieldCreatedAt)).Offset(offset).Limit(pageSize).All(context.Background())
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		for _, p := range posts {
			tags, _ := p.QueryTags().All(context.Background())
			p.Edges.Tags = tags
		}

		c.JSON(http.StatusOK, gin.H{
			"posts":    posts,
			"total":    total,
			"page":     page,
			"page_size": pageSize,
		})
	}
}

func getPost(client *ent.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		p, err := client.Post.Get(context.Background(), parseID(id))
		if err != nil {
			if ent.IsNotFound(err) {
				c.JSON(http.StatusNotFound, gin.H{"error": "Post not found"})
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			}
			return
		}
		tags, _ := p.QueryTags().All(context.Background())
		p.Edges.Tags = tags
		c.JSON(http.StatusOK, p)
	}
}

func createPost(client *ent.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		var input struct {
			Title       string   `json:"title"`
			Content     string   `json:"content"`
			Tags        []string `json:"tags"`
			ThumbnailURL string  `json:"thumbnail_url"`
		}
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		thumbnailURL := input.ThumbnailURL
		if thumbnailURL == "" {
			thumbnailURL = generateThumbnailURL(input.Title)
		}

		p, err := client.Post.Create().
			SetTitle(input.Title).
			SetContent(input.Content).
			SetThumbnailURL(thumbnailURL).
			Save(context.Background())
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		for _, tagName := range input.Tags {
			tagName = strings.TrimSpace(tagName)
			if tagName == "" {
				continue
			}
			t, err := client.Tag.Query().Where(tag.Name(tagName)).Only(context.Background())
			if err != nil {
				t, err = client.Tag.Create().SetName(tagName).Save(context.Background())
				if err != nil {
					continue
				}
			}
			_, err = client.Post.UpdateOne(p).AddTags(t).Save(context.Background())
			if err != nil {
				continue
			}
		}

		tags, _ := p.QueryTags().All(context.Background())
		p.Edges.Tags = tags
		c.JSON(http.StatusCreated, p)
	}
}

func updatePost(client *ent.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		p, err := client.Post.Get(context.Background(), parseID(id))
		if err != nil {
			if ent.IsNotFound(err) {
				c.JSON(http.StatusNotFound, gin.H{"error": "Post not found"})
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			}
			return
		}

		var input struct {
			Title       string   `json:"title"`
			Content     string   `json:"content"`
			Tags        []string `json:"tags"`
			ThumbnailURL string  `json:"thumbnail_url"`
		}
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		thumbnailURL := input.ThumbnailURL
		if thumbnailURL == "" {
			thumbnailURL = generateThumbnailURL(input.Title)
		}

		p, err = p.Update().
			SetTitle(input.Title).
			SetContent(input.Content).
			SetThumbnailURL(thumbnailURL).
			SetUpdatedAt(time.Now()).
			Save(context.Background())
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		_, err = p.Update().ClearTags().Save(context.Background())
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		for _, tagName := range input.Tags {
			tagName = strings.TrimSpace(tagName)
			if tagName == "" {
				continue
			}
			t, err := client.Tag.Query().Where(tag.Name(tagName)).Only(context.Background())
			if err != nil {
				t, err = client.Tag.Create().SetName(tagName).Save(context.Background())
				if err != nil {
					continue
				}
			}
			_, err = p.Update().AddTags(t).Save(context.Background())
			if err != nil {
				continue
			}
		}

		tags, _ := p.QueryTags().All(context.Background())
		p.Edges.Tags = tags
		c.JSON(http.StatusOK, p)
	}
}

func deletePost(client *ent.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		if err := client.Post.DeleteOneID(parseID(id)).Exec(context.Background()); err != nil {
			if ent.IsNotFound(err) {
				c.JSON(http.StatusNotFound, gin.H{"error": "Post not found"})
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			}
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Post deleted"})
	}
}

// niceColorPalette is a predefined list of pleasant tag background colors.
var niceColorPalette = []string{
	"#667eea",
	"#e74c3c",
	"#2ecc71",
	"#f39c12",
	"#9b59b6",
	"#1abc9c",
	"#3498db",
	"#e91e63",
}

func randomNiceColor() string {
	return niceColorPalette[time.Now().UnixNano()%int64(len(niceColorPalette))]
}

func listTags(client *ent.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		tags, err := client.Tag.Query().All(context.Background())
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, tags)
	}
}

func createTag(client *ent.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		var input struct {
			Name        string `json:"name"`
			Background  string `json:"background"`
		}
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		background := input.Background
		if background == "" {
			background = randomNiceColor()
		}
		t, err := client.Tag.Create().SetName(strings.TrimSpace(input.Name)).SetBackground(background).Save(context.Background())
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, t)
	}
}

func deleteTag(client *ent.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		if err := client.Tag.DeleteOneID(parseID(id)).Exec(context.Background()); err != nil {
			if ent.IsNotFound(err) {
				c.JSON(http.StatusNotFound, gin.H{"error": "Tag not found"})
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			}
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Tag deleted"})
	}
}

func parseID(s string) int {
	var id int
	for _, c := range s {
		if c >= '0' && c <= '9' {
			id = id*10 + int(c-'0')
		}
	}
	return id
}

// generateThumbnailURL creates a thumbnail URL from the post title
// using Picsum Photos (free placeholder service).
func generateThumbnailURL(title string) string {
	// Use a hash of the title to generate a consistent seed
	h := md5.Sum([]byte(title))
	seed := hex.EncodeToString(h[:])
	return fmt.Sprintf("https://picsum.photos/seed/%s/800/450", seed)
}

// backfillThumbnails updates existing posts that don't have a thumbnail URL.
func backfillThumbnails(client *ent.Client) {
	ctx := context.Background()
	posts, err := client.Post.Query().Where(post.ThumbnailURLIsNil()).All(ctx)
	if err != nil {
		log.Printf("backfillThumbnails: failed to query posts: %v", err)
		return
	}
	for _, p := range posts {
		thumbURL := generateThumbnailURL(p.Title)
		if _, err := p.Update().SetThumbnailURL(thumbURL).Save(ctx); err != nil {
			log.Printf("backfillThumbnails: failed to update post %d: %v", p.ID, err)
		}
	}
	if len(posts) > 0 {
		log.Printf("backfillThumbnails: updated %d posts with AI-generated thumbnails", len(posts))
	}
}

func init() {
	_ = fmt.Sprintf // suppress unused import warning
}
