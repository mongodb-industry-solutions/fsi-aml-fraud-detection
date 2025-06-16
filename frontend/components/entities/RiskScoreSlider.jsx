import { useState, useEffect } from 'react';
import { Body, Label } from '@leafygreen-ui/typography';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';

function RiskScoreSlider({ 
  min = 0, 
  max = 100, 
  value = [0, 100], 
  onChange, 
  distribution = {} 
}) {
  const [localValue, setLocalValue] = useState(value);
  
  useEffect(() => {
    setLocalValue(value);
  }, [value]);
  
  const handleMinChange = (e) => {
    const newMin = parseFloat(e.target.value);
    const newValue = [newMin, localValue[1]];
    setLocalValue(newValue);
    onChange?.(newMin, localValue[1]);
  };
  
  const handleMaxChange = (e) => {
    const newMax = parseFloat(e.target.value);
    const newValue = [localValue[0], newMax];
    setLocalValue(newValue);
    onChange?.(localValue[0], newMax);
  };
  
  const sliderStyle = {
    width: '100%',
    margin: `${spacing[2]}px 0`,
  };
  
  const inputStyle = {
    width: '100%',
    height: '8px',
    borderRadius: '4px',
    background: `linear-gradient(to right, 
      ${palette.green.light2} 0%, 
      ${palette.yellow.light2} 50%, 
      ${palette.red.light2} 100%)`,
    outline: 'none',
    appearance: 'none',
    WebkitAppearance: 'none',
    cursor: 'pointer',
  };
  
  const thumbStyle = `
    input[type="range"]::-webkit-slider-thumb {
      appearance: none;
      height: 16px;
      width: 16px;
      border-radius: 50%;
      background: ${palette.blue.base};
      cursor: pointer;
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    
    input[type="range"]::-moz-range-thumb {
      height: 16px;
      width: 16px;
      border-radius: 50%;
      background: ${palette.blue.base};
      cursor: pointer;
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
  `;
  
  return (
    <div style={{ minWidth: '250px' }}>
      <style>{thumbStyle}</style>
      <Label htmlFor="risk-score-slider">Risk Score Range</Label>
      
      <div style={sliderStyle}>
        <div style={{ display: 'flex', gap: spacing[2], marginBottom: spacing[1] }}>
          <div style={{ flex: 1 }}>
            <Body style={{ fontSize: '12px', color: palette.gray.dark1 }}>Min: {localValue[0]}</Body>
            <input
              type="range"
              min={min}
              max={max}
              value={localValue[0]}
              onChange={handleMinChange}
              style={inputStyle}
            />
          </div>
          <div style={{ flex: 1 }}>
            <Body style={{ fontSize: '12px', color: palette.gray.dark1 }}>Max: {localValue[1]}</Body>
            <input
              type="range"
              min={min}
              max={max}
              value={localValue[1]}
              onChange={handleMaxChange}
              style={inputStyle}
            />
          </div>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Body style={{ fontSize: '11px', color: palette.gray.base }}>
            Low Risk ({min})
          </Body>
          {distribution.avg_score && (
            <Body style={{ fontSize: '11px', color: palette.gray.base }}>
              Avg: {distribution.avg_score.toFixed(1)}
            </Body>
          )}
          <Body style={{ fontSize: '11px', color: palette.gray.base }}>
            High Risk ({max})
          </Body>
        </div>
      </div>
      
      <Body style={{ fontSize: '12px', color: palette.gray.dark1, marginTop: spacing[1] }}>
        Showing entities with risk scores between {localValue[0]} and {localValue[1]}
      </Body>
    </div>
  );
}

export default RiskScoreSlider;