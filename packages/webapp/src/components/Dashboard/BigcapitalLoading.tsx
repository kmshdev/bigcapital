// @ts-nocheck
import React from 'react';
import classNames from 'classnames';

import '@/style/components/BigcapitalLoading.scss';
import { useIsDarkMode } from '@/hooks/useDarkMode';

/**
 * Bookeepz logo loading.
 */
export default function BigcapitalLoading({ className }) {
  const isDarkmode = useIsDarkMode();

  return (
    <div className={classNames('bigcapital-loading', className)}>
      <div className="center">
        <div
          className="bigcapital-logo"
          style={{
            color: isDarkmode ? '#fff' : '#1c2127',
            fontSize: 34,
            fontWeight: 700,
            lineHeight: '37px',
          }}
        >
          Bookeepz
        </div>
      </div>
    </div>
  );
}
