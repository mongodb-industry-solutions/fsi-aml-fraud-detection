"use client";

export default function NotFound() {
  return (
    <div style={{ 
      maxWidth: '1200px', 
      margin: '0 auto', 
      padding: '24px',
      textAlign: 'center'
    }}>
      <h1>404 - Page Not Found</h1>
      <p>The page you are looking for does not exist.</p>
      <a href="/" style={{ 
        display: 'inline-block',
        margin: '20px 0',
        padding: '10px 20px',
        backgroundColor: '#00684A',
        color: 'white',
        textDecoration: 'none',
        borderRadius: '4px'
      }}>
        Return to Home
      </a>
    </div>
  );
}