import { useCallback } from 'react';

import { Popconfirm, Space } from 'antd';
import { Link } from 'react-router-dom';
import { CloseIcon } from '../../../Icons';
import { WhiteButton } from '../../../Button';

// Utils
import { useTranslation } from 'react-i18next';

// Redux
import { uiActions } from '../../../../store/slices/ui';
import { loginToSpotify, logout } from '../../../../store/slices/auth';
import { useAppDispatch, useAppSelector } from '../../../../store/store';

// Constants
import { ARTISTS_DEFAULT_IMAGE } from '../../../../constants/spotify';

const LoginButton = () => {
  const { t } = useTranslation(['home']);
  const dispatch = useAppDispatch();

  return <WhiteButton title={t('Log In')} onClick={() => dispatch(loginToSpotify(false))} />;
};

const Header = ({ opacity }: { opacity: number; title?: string }) => {
  const { t } = useTranslation(['navbar']);
  const dispatch = useAppDispatch();
  const user = useAppSelector(
    (state) => state.auth.user,
    (prev, next) => prev?.id === next?.id
  );

  return (
    <div
      className={`flex r-0 w-full flex-row items-center justify-between bg-gray-900 rounded-t-md z-10`}
      style={{ backgroundColor: `rgba(12, 12, 12, ${opacity}%)` }}
    >
      <div className='flex flex-row items-center'>
        <Space>
          {/*
          <div className='news'>
            <News />
          </div> */}

          {user ? (
            <>
              <div className='avatar-container'>
                <Link to={`/users/${user!.id}`}>
                  <img
                    className='avatar'
                    id='user-avatar'
                    alt='User Avatar'
                    style={{ marginTop: -1 }}
                    src={
                      user?.images && user.images.length ? user.images[0].url : ARTISTS_DEFAULT_IMAGE
                    }
                  />
                </Link>
              </div>
              <WhiteButton
                size='small'
                title={t('Log Out')}
                onClick={() => dispatch(logout())}
              />
            </>
          ) : (
            <LoginButton />
          )}
        </Space>
      </div>
    </div>
  );
};

export default Header;
