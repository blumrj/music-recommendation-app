/**
 * ONBOARDING SUCCESS SCREEN
 * 
 * Shown after:
 * 1. User completes 10 surveys
 * 2. Claude analyzes their emotional profile
 * 3. UserTasteProfile is created
 * 
 * Displays profile summary and auto-advances to home
 */

import React, { useState, useEffect } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { apiClient } from '../services/api';
import '../styles/OnboardingSuccessScreen.css';

interface OnboardingSuccessScreenProps {
  onContinue: () => void;
}

export const OnboardingSuccessScreen: React.FC<OnboardingSuccessScreenProps> = ({
  onContinue,
}) => {
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoAdvance, setAutoAdvance] = useState(3);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await apiClient.getTasteProfile();
        setProfile(data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching taste profile:', error);
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  // Auto-advance to home after 3 seconds
  useEffect(() => {
    if (autoAdvance === 0) {
      onContinue();
      return;
    }

    const timer = setTimeout(() => {
      setAutoAdvance((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [autoAdvance, onContinue]);

  const userType = (profile?.userType as string) || 'Music Listener';
  const dominantThemes = (profile?.dominantThemes as string[]) || [];
  const insights = (profile?.insights as string) || '';

  return (
    <Box
      className="success-container"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#c0c0c0',
        padding: 2,
      }}
    >
      <Box
        className="success-window"
        sx={{
          backgroundColor: '#c0c0c0',
          border: '2px solid',
          borderColor: '#ffffff #808080 #808080 #ffffff',
          borderRadius: '0px',
          maxWidth: '500px',
          width: '100%',
          padding: 3,
          boxShadow: 'inset 1px 1px 0 0 #dfdfdf, inset -1px -1px 0 0 #808080',
          textAlign: 'center',
        }}
      >
        {/* Success Icon */}
        <Box
          sx={{
            fontSize: '48px',
            mb: 2,
          }}
        >
          ✨
        </Box>

        {/* Title */}
        <Typography
          variant="h5"
          sx={{
            fontWeight: 'bold',
            fontSize: '16px',
            mb: 1,
            color: '#7B5BA8',
          }}
        >
          PROFILE CREATED!
        </Typography>

        <Typography
          sx={{
            fontSize: '12px',
            mb: 3,
            color: '#555',
          }}
        >
          We analyzed your 10 albums and created your emotional profile.
        </Typography>

        {/* Loading State */}
        {loading ? (
          <Typography sx={{ fontSize: '11px', color: '#555', mb: 2 }}>
            Loading your profile...
          </Typography>
        ) : (
          <>
            {/* Profile Summary */}
            <Box
              sx={{
                backgroundColor: '#dfdfdf',
                border: '2px solid',
                borderColor: '#808080 #ffffff #ffffff #808080',
                padding: 2,
                mb: 2,
                textAlign: 'left',
              }}
            >
              {/* User Type */}
              <Typography
                sx={{
                  fontSize: '11px',
                  fontWeight: 'bold',
                  mb: 1,
                }}
              >
                Your Type:
              </Typography>
              <Typography
                sx={{
                  fontSize: '11px',
                  mb: 2,
                  color: '#555',
                }}
              >
                {userType}
              </Typography>

              {/* Dominant Themes */}
              {dominantThemes.length > 0 && (
                <>
                  <Typography
                    sx={{
                      fontSize: '11px',
                      fontWeight: 'bold',
                      mb: 1,
                    }}
                  >
                    Main Themes:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                    {dominantThemes.map((theme, i) => (
                      <Box
                        key={i}
                        sx={{
                          backgroundColor: '#c0c0c0',
                          border: '1px solid #999',
                          padding: '2px 6px',
                          fontSize: '10px',
                          borderRadius: '2px',
                        }}
                      >
                        {theme}
                      </Box>
                    ))}
                  </Box>
                </>
              )}

              {/* Insights */}
              {insights && (
                <>
                  <Typography
                    sx={{
                      fontSize: '11px',
                      fontWeight: 'bold',
                      mb: 1,
                    }}
                  >
                    Insights:
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: '10px',
                      color: '#555',
                      lineHeight: 1.4,
                    }}
                  >
                    {insights}
                  </Typography>
                </>
              )}
            </Box>

            {/* Message */}
            <Typography
              sx={{
                fontSize: '12px',
                fontWeight: 'bold',
                mb: 2,
                color: '#000',
              }}
            >
              Ready to get personalized recommendations?
            </Typography>
          </>
        )}

        {/* Continue Button */}
        <Button
          variant="contained"
          onClick={onContinue}
          sx={{
            fontSize: '11px',
            textTransform: 'none',
            padding: '6px 16px',
            backgroundColor: '#c0c0c0',
            color: '#000',
            border: '2px solid',
            borderColor: '#ffffff #808080 #808080 #ffffff',
            '&:hover': {
              backgroundColor: '#dfdfdf',
            },
            fontWeight: 'bold',
          }}
        >
          Continue to Home ({autoAdvance}s)
        </Button>

        {/* Footer */}
        <Typography
          sx={{
            fontSize: '9px',
            color: '#999',
            mt: 2,
          }}
        >
          Auto-advancing in {autoAdvance} seconds...
        </Typography>
      </Box>
    </Box>
  );
};
