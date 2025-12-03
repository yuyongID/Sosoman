import React from 'react';
import { searchUser, type UserSearchResult } from '@api/common/userSearch';
import type {
  LoginProfileSnapshot,
  LoginUserSnapshot,
} from '@renderer/config/loginPersistence';

const buildFilterPayload = (user: LoginUserSnapshot): string =>
  JSON.stringify([
    {
      key: 'addBy',
      value: {
        id: user.id,
        name: user.name,
        account: user.account,
        user_code: user.userCode,
        org_name: user.orgName,
        position_name: user.positionName,
        second_job_seq_name: user.secondJobSeqName,
        three_job_seq_name: user.threeJobSeqName,
      },
      type: 'eq',
      rule: 'and',
    },
  ]);

const mapSearchResult = (user: UserSearchResult): LoginUserSnapshot => ({
  id: user.id,
  userCode: user.userCode,
  name: user.name,
  account: user.account,
  orgName: user.orgName,
  positionName: user.positionName,
  secondJobSeqName: user.secondJobSeqName,
  threeJobSeqName: user.threeJobSeqName,
});

const formatUserLabel = (user: LoginUserSnapshot): string => {
  const identifier = user.userCode || user.account;
  return identifier ? `${user.name}(${identifier})` : user.name;
};

interface LoginScreenProps {
  initialKeyword?: string;
  initialUser?: LoginUserSnapshot | null;
  allowCancel?: boolean;
  onCancel?: () => void;
  onAuthenticated: (profile: LoginProfileSnapshot) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  initialKeyword,
  initialUser,
  allowCancel = false,
  onCancel,
  onAuthenticated,
}) => {
  const fallbackKeyword =
    initialKeyword ?? (initialUser ? formatUserLabel(initialUser) : '');
  const [keyword, setKeyword] = React.useState(fallbackKeyword);
  const [autoSearchEnabled, setAutoSearchEnabled] = React.useState(false);
  const [suggestions, setSuggestions] = React.useState<UserSearchResult[]>([]);
  const [selectedUser, setSelectedUser] = React.useState<LoginUserSnapshot | null>(
    initialUser ?? null
  );
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const requestIdRef = React.useRef(0);
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const inputContainerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!autoSearchEnabled) {
      return;
    }
    const trimmed = keyword.trim();
    if (!trimmed) {
      setSuggestions([]);
      setLoading(false);
      setError(null);
      return;
    }
    const debounceHandle = window.setTimeout(() => {
      const currentRequest = requestIdRef.current + 1;
      requestIdRef.current = currentRequest;
      setLoading(true);
      searchUser(trimmed)
        .then((results) => {
          if (requestIdRef.current !== currentRequest) {
            return;
          }
          setSuggestions(results);
          setError(null);
        })
        .catch((err: unknown) => {
          if (requestIdRef.current !== currentRequest) {
            return;
          }
          const message =
            err instanceof Error ? err.message : '用户搜索失败，请稍后重试';
          setError(message);
          setSuggestions([]);
        })
        .finally(() => {
          if (requestIdRef.current === currentRequest) {
            setLoading(false);
          }
        });
    }, 320);

    return () => {
      window.clearTimeout(debounceHandle);
    };
  }, [keyword, autoSearchEnabled]);

  const handleInputChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const nextValue = event.target.value;
      setKeyword(nextValue);
      setAutoSearchEnabled(true);
      setSelectedUser(null);
      setError(null);
      setDropdownOpen(true);
      if (!nextValue.trim()) {
        setSuggestions([]);
      }
    },
    []
  );

  const handleSuggestionSelect = React.useCallback((user: UserSearchResult) => {
    const snapshot = mapSearchResult(user);
    setSelectedUser(snapshot);
    setKeyword(formatUserLabel(snapshot));
    setAutoSearchEnabled(false);
    setDropdownOpen(false);
  }, []);

  const handleLogin = React.useCallback(() => {
    if (!selectedUser || !selectedUser.account) {
      return;
    }
    const payload: LoginProfileSnapshot = {
      keyword: keyword.trim() || formatUserLabel(selectedUser),
      selectedUser,
      interfaceFilter: buildFilterPayload(selectedUser),
    };
    onAuthenticated(payload);
  }, [keyword, onAuthenticated, selectedUser]);

  const disabled = !selectedUser || !selectedUser.account;
  const missingAccount = selectedUser && !selectedUser.account;

  const showDropdown =
    dropdownOpen && (loading || suggestions.length > 0 || keyword.trim().length > 0);

  React.useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (!inputContainerRef.current) {
        return;
      }
      if (inputContainerRef.current.contains(event.target as Node)) {
        return;
      }
      setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const renderSuggestionState = () => {
    if (loading) {
      return (
        <div style={{ padding: '10px 12px', color: '#9ca3af', fontSize: '0.85rem' }}>搜索中…</div>
      );
    }
    if (suggestions.length === 0 && keyword.trim()) {
      return (
        <div style={{ padding: '10px 12px', color: '#6b7280', fontSize: '0.85rem' }}>
          暂无结果
        </div>
      );
    }
    return suggestions.map((item) => {
      const isActive = selectedUser?.id === item.id;
      return (
        <button
          key={item.id}
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => handleSuggestionSelect(item)}
          style={{
            width: '100%',
            textAlign: 'left',
            border: 'none',
            backgroundColor: isActive ? 'rgba(33,144,255,0.15)' : 'transparent',
            color: '#f3f4f6',
            padding: '10px 12px',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
          }}
        >
          <span style={{ fontWeight: 600 }}>{item.account || item.name}</span>
          <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
            {item.name} · {item.orgName || '-'}
          </span>
        </button>
      );
    });
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at top, #1f2937, #0f1117)',
        padding: '40px 16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          backgroundColor: '#151821',
          borderRadius: '16px',
          padding: '32px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>登录 Sosoman</div>
        <label style={{ fontSize: '0.9rem', color: '#cbd5f5' }}>输入邮箱 / 姓名 / 工号</label>
        <div style={{ position: 'relative' }} ref={inputContainerRef}>
          <input
            value={keyword}
            onChange={handleInputChange}
            placeholder="如 dengyu032 / 邓裕"
            onFocus={() => setDropdownOpen(true)}
            style={{
              width: '100%',
              padding: '14px 16px',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.1)',
              backgroundColor: '#0f121a',
              color: '#f3f4f6',
              fontSize: '1rem',
              outline: 'none',
              transition: 'border-color 160ms ease, box-shadow 160ms ease',
              boxShadow: '0 4px 30px rgba(15,18,26,0.35)',
            }}
          />
          <div
            className="dark-scrollbar"
            style={{
              visibility: showDropdown ? 'visible' : 'hidden',
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              right: 0,
              backgroundColor: '#0f121a',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 20px 30px rgba(0,0,0,0.35)',
              maxHeight: '220px',
              overflowY: 'auto',
              zIndex: 10,
            }}
          >
            {renderSuggestionState()}
          </div>
        </div>
        {error && (
          <div
            style={{
              padding: '10px 12px',
              borderRadius: '10px',
              backgroundColor: 'rgba(248,113,113,0.08)',
              color: '#fca5a5',
              fontSize: '0.9rem',
            }}
          >
            {error}
          </div>
        )}
        {missingAccount && (
          <div
            style={{
              padding: '10px 12px',
              borderRadius: '10px',
              backgroundColor: 'rgba(251,191,36,0.1)',
              color: '#fbbf24',
              fontSize: '0.9rem',
            }}
          >
            该人员缺少邮箱账号，请换一个结果。
          </div>
        )}
        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
          {allowCancel && (
            <button
              type="button"
              onClick={onCancel}
              style={{
                flex: 1,
                padding: '12px 0',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.15)',
                backgroundColor: 'transparent',
                color: '#f3f4f6',
                cursor: 'pointer',
              }}
            >
              返回
            </button>
          )}
          <button
            type="button"
            onClick={handleLogin}
            disabled={disabled}
            style={{
              flex: 1,
              padding: '12px 0',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: disabled ? 'rgba(33,144,255,0.25)' : '#2190FF',
              color: disabled ? 'rgba(255,255,255,0.7)' : '#fff',
              cursor: disabled ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              boxShadow: disabled ? 'none' : '0 10px 30px rgba(33,144,255,0.35)',
            }}
          >
            登录
          </button>
        </div>
      </div>
    </div>
  );
};
