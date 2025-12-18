"use client";

import * as React from "react";

const Avatar = React.forwardRef(({ className = "", style = {}, ...props }, ref) => (
  <div
    ref={ref}
    style={{
      position: 'relative',
      display: 'flex',
      height: '40px',
      width: '40px',
      flexShrink: 0,
      overflow: 'hidden',
      borderRadius: '50%',
      ...style
    }}
    className={className}
    {...props}
  />
));
Avatar.displayName = "Avatar";

const AvatarImage = React.forwardRef(({ className = "", style = {}, ...props }, ref) => (
  <img
    ref={ref}
    style={{
      aspectRatio: '1 / 1',
      height: '100%',
      width: '100%',
      objectFit: 'cover',
      ...style
    }}
    className={className}
    {...props}
  />
));
AvatarImage.displayName = "AvatarImage";

const AvatarFallback = React.forwardRef(({ className = "", style = {}, ...props }, ref) => (
  <div
    ref={ref}
    style={{
      display: 'flex',
      height: '100%',
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '50%',
      backgroundColor: '#e5e7eb',
      ...style
    }}
    className={className}
    {...props}
  />
));
AvatarFallback.displayName = "AvatarFallback";

export { Avatar, AvatarImage, AvatarFallback };

