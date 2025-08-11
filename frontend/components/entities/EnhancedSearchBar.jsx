"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import TextInput from '@leafygreen-ui/text-input';
import Icon from '@leafygreen-ui/icon';
import { Body } from '@leafygreen-ui/typography';
import { palette } from '@leafygreen-ui/palette';
import { spacing } from '@leafygreen-ui/tokens';

/**
 * Enhanced Search Bar with autocomplete functionality
 * 
 * Features:
 * - Real-time autocomplete suggestions using /entities/search/autocomplete
 * - Debounced search to optimize API calls
 * - Keyboard navigation (arrow keys, enter, escape)
 * - Clean, minimal UI with LeafyGreen components
 */
export default function EnhancedSearchBar({ 
  onSearch, 
  onQueryChange,
  placeholder = "Search entities by name...",
  debounceMs = 300 
}) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const debounceRef = useRef(null);
  const router = useRouter();

  // Fetch autocomplete suggestions
  const fetchSuggestions = async (searchQuery) => {
    if (searchQuery.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      setLoading(true);
      const amlApiUrl = process.env.NEXT_PUBLIC_AML_API_URL || 'http://localhost:8001';
      const response = await fetch(
        `${amlApiUrl}/entities/search/autocomplete?q=${encodeURIComponent(searchQuery)}&limit=8`
      );
      
      if (response.ok) {
        const data = await response.json();
        const suggestionList = data.data?.suggestions || [];
        setSuggestions(suggestionList);
        setShowSuggestions(suggestionList.length > 0);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error('Autocomplete error:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search handler
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      if (query.trim()) {
        fetchSuggestions(query.trim());
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
      
      // Notify parent of query change
      onQueryChange?.(query.trim());
    }, debounceMs);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, debounceMs, onQueryChange]);

  // Handle input change
  const handleInputChange = (event) => {
    const value = event.target.value;
    setQuery(value);
    setSelectedIndex(-1);
  };

  // Handle suggestion selection - navigate directly to entity details
  const handleSuggestionSelect = (suggestion) => {
    setQuery(suggestion.name);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    // Navigate directly to entity details page instead of searching
    router.push(`/entities/${suggestion.entityId}`);
  };

  // Handle keyboard navigation
  const handleKeyDown = (event) => {
    if (!showSuggestions) {
      if (event.key === 'Enter') {
        onSearch?.(query.trim());
      }
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      
      case 'ArrowUp':
        event.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      
      case 'Enter':
        event.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionSelect(suggestions[selectedIndex]);
        } else {
          onSearch?.(query.trim());
        }
        break;
      
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        suggestionsRef.current && 
        !suggestionsRef.current.contains(event.target) &&
        !inputRef.current?.contains(event.target)
      ) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <TextInput
        ref={inputRef}
        label="Search Entities"
        placeholder={placeholder}
        value={query}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        style={{ width: '100%' }}
      />

      {/* Autocomplete Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: 'white',
            border: `1px solid ${palette.gray.light1}`,
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 1000,
            maxHeight: '240px',
            overflowY: 'auto',
            marginTop: spacing[1]
          }}
        >
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              onClick={() => handleSuggestionSelect(suggestion)}
              style={{
                padding: `${spacing[2]}px ${spacing[3]}px`,
                cursor: 'pointer',
                borderBottom: index < suggestions.length - 1 ? `1px solid ${palette.gray.light2}` : 'none',
                backgroundColor: index === selectedIndex ? palette.gray.light2 : 'transparent',
                transition: 'background-color 0.15s ease'
              }}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <Body style={{ 
                margin: 0,
                color: palette.gray.dark2,
                display: 'flex',
                alignItems: 'center',
                gap: spacing[2]
              }}>
                <Icon glyph="Person" size={14} fill={palette.gray.base} />
                {suggestion.name}
                <span style={{ 
                  marginLeft: 'auto', 
                  fontSize: '12px', 
                  color: palette.gray.base 
                }}>
                  {suggestion.entityId}
                </span>
              </Body>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}