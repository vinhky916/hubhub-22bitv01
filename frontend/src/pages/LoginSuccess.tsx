import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setAuth } from '../store/slices/authSlice';
import apiClient from '../core/api/client';
import { Loader2 } from 'lucide-react';

export const LoginSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    const fetchUserData = async () => {
      const accessToken = searchParams.get('token');

      if (!accessToken) {
        console.error('[Social Login Error]: No access token provided in callback URL');
        navigate('/login?error=no_token', { replace: true });
        return;
      }

      try {
        // Gọi API lấy thông tin profile bằng token nhận được
        const res = await apiClient.get('/auth/me', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (res.data.success) {
          const user = res.data.data;
          // Lưu vào Redux Store
          dispatch(
            setAuth({
              user: user,
              accessToken: accessToken,
            })
          );
          
          let targetPath = '/';
          if (user?.role === 'ADMIN') {
            targetPath = '/admin-dashboard';
          } else if (user?.role === 'HOTEL_OWNER') {
            targetPath = '/owner-dashboard';
          }

          // Điều hướng về trang dashboard hoặc trang chủ
          navigate(targetPath, { replace: true });
        } else {
          navigate('/login?error=failed_fetch_profile', { replace: true });
        }
      } catch (err) {
        console.error('[Social Login Error]: Failed to fetch user profile:', err);
        navigate('/login?error=server_error', { replace: true });
      }
    };

    fetchUserData();
  }, [searchParams, navigate, dispatch]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
      <Loader2 className="w-10 h-10 animate-spin text-primary" />
      <div className="text-center space-y-1">
        <h3 className="font-extrabold text-slate-800 text-lg">Đang xác thực tài khoản...</h3>
        <p className="text-xs text-slate-400 font-medium">Hệ thống đang đồng bộ dữ liệu phiên đăng nhập của bạn.</p>
      </div>
    </div>
  );
};

export default LoginSuccess;
