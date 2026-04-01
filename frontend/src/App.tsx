import { Provider } from 'react-redux';
import { store } from './store/store';
import { LoginPage } from './components/LoginPage';
import { AppLayout } from './components/AppLayout';
import { PostListPage } from './pages/PostListPage';
import { PostCreatePage } from './pages/PostCreatePage';
import { PostDetailPage } from './pages/PostDetailPage';
import { PostEditPage } from './pages/PostEditPage';
import { TagManager } from './components/TagManager';
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from './store/store';
import './App.css';

function TagsPage() {
  return <TagManager />;
}

function AuthRouter() {
  const isAuthenticated = useSelector(
    (state: RootState) => state.auth.isAuthenticated
  );

  const router = createBrowserRouter([
    {
      path: '/login',
      element: isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />,
    },
    {
      path: '/',
      element: isAuthenticated ? <AppLayout /> : <Navigate to="/login" replace />,
      children: [
        {
          index: true,
          element: <PostListPage />,
        },
        {
          path: 'posts/new',
          element: <PostCreatePage />,
        },
        {
          path: 'posts/:id',
          element: <PostDetailPage />,
        },
        {
          path: 'posts/:id/edit',
          element: <PostEditPage />,
        },
        {
          path: 'tags',
          element: <TagsPage />,
        },
      ],
    },
    {
      path: '*',
      element: <Navigate to={isAuthenticated ? '/' : '/login'} replace />,
    },
  ]);

  return <RouterProvider router={router} />;
}

function App() {
  return (
    <Provider store={store}>
      <AuthRouter />
    </Provider>
  );
}

export default App;
