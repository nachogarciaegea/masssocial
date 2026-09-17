import React from 'react';

export const LogoTextComponent = () => {
  return (
    <svg
      width="190"
      height="33"
      viewBox="0 0 190 33"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g transform="translate(0 2) scale(0.725)">
        <rect width="40" height="40" rx="9" fill="#E5007D" />
        <path
          d="M8 30V10H13.2L20 21.4L26.8 10H32V30H27.2V18.6L20 30L12.8 18.6V30H8Z"
          fill="#FFFFFF"
        />
        <circle cx="32.5" cy="8.5" r="3" fill="#19D3FF" />
      </g>
      <text
        x="38"
        y="24"
        fill="#FFFFFF"
        fontFamily="'Plus Jakarta Sans', sans-serif"
        fontSize="19"
        fontWeight="800"
        letterSpacing="2"
      >
        MASSSOCIAL
      </text>
    </svg>
  );
};
