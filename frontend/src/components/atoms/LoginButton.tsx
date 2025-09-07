import React, { useState } from 'react';
import { supabase } from '../../utils/supabaseClient';
import styles from './LoginButton.module.css';

interface LoginButtonProps {
  className?: string;
}

interface User {
  email?: string;
  user_metadata?: {
    avatar_url?: string;
    full_name?: string;
  };
}

const LoginButton: React.FC<LoginButtonProps> = ({ className }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Supabase 환경 변수 체크
  const isSupabaseConfigured =
    import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY;

  // 로그인 상태 확인
  React.useEffect(() => {
    if (!isSupabaseConfigured) return;

    const checkUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          setIsLoggedIn(true);
          setUser(user);
        }
      } catch (error) {
        console.warn('Supabase 인증 확인 실패:', error);
      }
    };
    checkUser();

    // 인증 상태 변화 감지
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setIsLoggedIn(true);
        setUser(session.user);
      } else {
        setIsLoggedIn(false);
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [isSupabaseConfigured]);

  const handleGoogleLogin = async () => {
    if (!isSupabaseConfigured) {
      alert('로그인 기능이 설정되지 않았습니다. 관리자에게 문의하세요.');
      return;
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/schedule`,
      },
    });
    if (error) console.error('Google 로그인 에러:', error);
  };

  const handleKakaoLogin = async () => {
    if (!isSupabaseConfigured) {
      alert('로그인 기능이 설정되지 않았습니다. 관리자에게 문의하세요.');
      return;
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: `${window.location.origin}/schedule`,
      },
    });
    if (error) console.error('카카오 로그인 에러:', error);
  };

  const handleLogout = async () => {
    if (!isSupabaseConfigured) return;

    const { error } = await supabase.auth.signOut();
    if (error) console.error('로그아웃 에러:', error);
  };

  // Supabase가 설정되지 않은 경우 로그인 버튼 숨기기
  if (!isSupabaseConfigured) {
    return null;
  }

  if (isLoggedIn && user) {
    return (
      <div className={`${styles.userMenu} ${className || ''}`}>
        <button
          className={styles.userButton}
          onClick={() => setShowLoginModal(!showLoginModal)}
          title="사용자 메뉴"
        >
          <div className={styles.userAvatar}>
            {user.user_metadata?.avatar_url ? (
              <img
                src={user.user_metadata.avatar_url}
                alt="프로필"
                className={styles.avatarImage}
              />
            ) : (
              <span className={styles.avatarText}>
                {user.email?.charAt(0).toUpperCase() || 'U'}
              </span>
            )}
          </div>
        </button>

        {showLoginModal && (
          <div className={styles.userDropdown}>
            <div className={styles.userInfo}>
              <div className={styles.userName}>
                {user.user_metadata?.full_name ||
                  user.email?.split('@')[0] ||
                  '사용자'}
              </div>
              <div className={styles.userEmail}>{user.email}</div>
            </div>
            <button className={styles.logoutButton} onClick={handleLogout}>
              로그아웃
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <button
        className={`${styles.loginButton} ${className || ''}`}
        onClick={() => setShowLoginModal(true)}
        title="로그인"
      >
        <svg
          className={styles.loginIcon}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
          <polyline points="10,17 15,12 10,7" />
          <line x1="15" y1="12" x2="3" y2="12" />
        </svg>
        로그인
      </button>

      {showLoginModal && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowLoginModal(false)}
        >
          <div className={styles.loginModal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>로그인</h2>
              <button
                className={styles.closeButton}
                onClick={() => setShowLoginModal(false)}
              >
                ×
              </button>
            </div>

            <div className={styles.loginContent}>
              <p className={styles.loginDescription}>
                소셜 계정으로 간편하게 로그인하세요
              </p>

              <div className={styles.socialButtons}>
                <button
                  className={`${styles.socialButton} ${styles.googleButton}`}
                  onClick={handleGoogleLogin}
                >
                  <svg className={styles.socialIcon} viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Google로 로그인
                </button>

                <button
                  className={`${styles.socialButton} ${styles.kakaoButton}`}
                  onClick={handleKakaoLogin}
                >
                  <svg className={styles.socialIcon} viewBox="0 0 24 24">
                    <path
                      fill="#FEE500"
                      d="M12 3C6.48 3 2 6.48 2 10.5c0 2.5 1.5 4.7 3.8 6.1L5.2 18.5c-.1.2-.1.4 0 .6.1.2.3.3.5.3h.6l2.1-1.4c.5.1 1 .1 1.5.1 5.52 0 10-3.48 10-7.5S17.52 3 12 3z"
                    />
                    <path
                      fill="#3C1E1E"
                      d="M8.5 9.5c-.8 0-1.5-.7-1.5-1.5s.7-1.5 1.5-1.5 1.5.7 1.5 1.5-.7 1.5-1.5 1.5zm7 0c-.8 0-1.5-.7-1.5-1.5s.7-1.5 1.5-1.5 1.5.7 1.5 1.5-.7 1.5-1.5 1.5z"
                    />
                  </svg>
                  카카오로 로그인
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LoginButton;
