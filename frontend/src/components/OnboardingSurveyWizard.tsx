/**
 * ONBOARDING SURVEY WIZARD
 * 
 * First-time user experience that:
 * 1. Guides users through surveying 5 saved Spotify albums
 * 2. Shows one album per survey
 * 3. Reuses AlbumSurveyModal for consistent survey experience
 * 4. After 5 surveys, auto-triggers profile analysis
 * 5. Shows progress bar indicating completion
 * 6. Can skip albums - replaced with unrated albums from saved list
 */

import React, { useState, useEffect } from 'react';
import { Box, LinearProgress, Typography, Button, CircularProgress } from '@mui/material';
import { ExperientialSurveyModal } from './ExperientialSurveyModal';
import { apiClient } from '../services/api';
import '../styles/OnboardingSurveyWizard.css';

interface Album {
  spotifyId: string;
  name: string;
  artist: string;
  imageUrl: string;
  spotifyUrl?: string;
}

interface OnboardingSurveyWizardProps {
  albums: Album[];
  onComplete: () => void;
  onSkip?: () => void;
}

export const OnboardingSurveyWizard: React.FC<OnboardingSurveyWizardProps> = ({
  albums,
  onComplete,
  onSkip,
}) => {
  const [currentAlbumIndex, setCurrentAlbumIndex] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showSurveyModal, setShowSurveyModal] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasRestoredState, setHasRestoredState] = useState(false);

  // Restore wizard progress from sessionStorage if resuming
  // eslint-disable react-hooks/exhaustive-deps
  useEffect(() => {
    if (!hasRestoredState) {
      const savedState = sessionStorage.getItem('onboarding');
      if (savedState) {
        try {
          const state = JSON.parse(savedState);
          setCurrentAlbumIndex(state.currentIndex);
          setCompletedCount(state.completedCount);
        } catch (e) {
          // Failed to restore wizard state
        }
      }
      setHasRestoredState(true);
    }
  }, [hasRestoredState]);

  // Save wizard state to sessionStorage whenever it changes
  useEffect(() => {
    const state = {
      started: true,
      currentIndex: currentAlbumIndex,
      completedCount,
      albumIds: albums.map((a) => a.spotifyId),
    };
    sessionStorage.setItem('onboarding', JSON.stringify(state));
  }, [currentAlbumIndex, completedCount, albums]);

  if (!albums || albums.length === 0) {
    return (
      <Box
        className="onboarding-container onboarding-error"
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          backgroundColor: '#c0c0c0',
          border: '2px solid',
          borderColor: '#ffffff #808080 #808080 #ffffff',
          padding: 2,
        }}
      >
        <Typography sx={{ mb: 2, fontWeight: 'bold' }}>
          No saved albums found
        </Typography>
        <Button variant="contained" onClick={() => onSkip?.()}>
          Continue to Home
        </Button>
      </Box>
    );
  }

  const currentAlbum = albums[currentAlbumIndex];
  const progress = ((completedCount / Math.min(5, albums.length)) * 100) || 0;
  const minSurveysNeeded = Math.min(5, albums.length);
  const isOnLastAlbum = currentAlbumIndex >= albums.length - 1;

  const handleSurveyComplete = async () => {
    try {
      setError(null);
      const newCompletedCount = completedCount + 1;
      setCompletedCount(newCompletedCount);
      setShowSurveyModal(false);

      // Check if we've completed 5 surveys
      if (newCompletedCount >= minSurveysNeeded) {
        // Auto-analyze profile
        setIsAnalyzing(true);
        try {
          await apiClient.analyzeTaste();
          setIsAnalyzing(false);
          // Clear session storage after successful analysis
          sessionStorage.removeItem('onboarding');
          onComplete();
        } catch (err) {
          setError('Failed to analyze profile. Please try again.');
          setIsAnalyzing(false);
        }
      } else if (isOnLastAlbum) {
        // We passed the last album without hitting 5 surveys
        // Still trigger analysis since we have the max available
        setIsAnalyzing(true);
        try {
          await apiClient.analyzeTaste();
          setIsAnalyzing(false);
          sessionStorage.removeItem('onboarding');
          onComplete();
        } catch (err) {
          setError('Failed to analyze profile. Please try again.');
          setIsAnalyzing(false);
        }
      } else {
        // Move to next album
        setTimeout(() => {
          setCurrentAlbumIndex((prev) => prev + 1);
          setShowSurveyModal(true);
        }, 300);
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    }
  };

  const handleNavigateNext = () => {
    if (currentAlbumIndex < albums.length - 1) {
      setCurrentAlbumIndex((prev) => prev + 1);
      setShowSurveyModal(true);
    }
  };

  const handleNavigateBack = () => {
    if (currentAlbumIndex > 0) {
      setCurrentAlbumIndex((prev) => prev - 1);
      setShowSurveyModal(true);
    }
  };

  const _handleSkipAlbum = () => {
    // Skip current album and move to next
    if (currentAlbumIndex < albums.length - 1) {
      setCurrentAlbumIndex((prev) => prev + 1);
      setShowSurveyModal(true);
    } else {
      // If on last album, show message and continue to analysis
      // User has completed what they can
      setShowSurveyModal(false);
      if (completedCount > 0) {
        // Start analysis with whatever surveys they completed
        setIsAnalyzing(true);
        apiClient.analyzeTaste().then(() => {
          sessionStorage.removeItem('onboarding');
          onComplete();
        }).catch((err) => {
          setError('Failed to analyze profile. Please try again.');
          setIsAnalyzing(false);
        });
      } else {
        // No surveys completed, just skip onboarding
        onSkip?.();
      }
    }
  };

  const handleSkipOnboarding = () => {
    if (window.confirm('Skip onboarding? You can always survey albums later.')) {
      sessionStorage.removeItem('onboarding');
      onSkip?.();
    }
  };

  if (isAnalyzing) {
    return (
      <Box
        className="onboarding-container onboarding-analyzing"
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          backgroundColor: '#c0c0c0',
          border: '2px solid',
          borderColor: '#ffffff #808080 #808080 #ffffff',
          padding: 2,
        }}
      >
        <CircularProgress sx={{ mb: 2 }} />
        <Typography sx={{ fontWeight: 'bold', mb: 1 }}>
          Analyzing your taste...
        </Typography>
        <Typography sx={{ fontSize: '11px', color: '#555' }}>
          This may take a few moments
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      className="onboarding-container"
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
        className="onboarding-window"
        sx={{
          backgroundColor: '#c0c0c0',
          border: '2px solid',
          borderColor: '#ffffff #808080 #808080 #ffffff',
          borderRadius: '0px',
          maxWidth: '600px',
          width: '100%',
          padding: 2,
          boxShadow: 'inset 1px 1px 0 0 #dfdfdf, inset -1px -1px 0 0 #808080',
        }}
      >
        {/* Header */}
        <Box sx={{ mb: 2 }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 'bold',
              fontSize: '12px',
              mb: 1,
            }}
          >
            Album Survey {completedCount + 1} of {minSurveysNeeded}
          </Typography>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 16,
              backgroundColor: '#c0c0c0',
              border: '2px solid',
              borderColor: '#808080 #ffffff #ffffff #808080',
              '& .MuiLinearProgress-bar': {
                backgroundColor: '#7B5BA8',
                backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,.2) 2px, rgba(255,255,255,.2) 4px)',
              },
            }}
          />
          <Typography sx={{ fontSize: '10px', mt: 0.5, color: '#555' }}>
            {completedCount} surveys completed
          </Typography>
        </Box>

        {/* Album Display */}
        <Box
          className="onboarding-album-display"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            mb: 2,
            backgroundColor: '#dfdfdf',
            padding: 2,
            border: '2px solid',
            borderColor: '#808080 #ffffff #ffffff #808080',
          }}
        >
          <Box
            sx={{
              width: '80px',
              height: '80px',
              minWidth: '80px',
              backgroundColor: '#555',
              border: '1px solid #999',
              overflow: 'hidden',
            }}
          >
            <img
              src={currentAlbum.imageUrl}
              alt={currentAlbum.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              sx={{
                fontWeight: 'bold',
                fontSize: '12px',
                mb: 0.5,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {currentAlbum.name}
            </Typography>
            <Typography
              sx={{
                fontSize: '11px',
                color: '#555',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {currentAlbum.artist}
            </Typography>
          </Box>
        </Box>

        {/* Survey Modal (reused component) - Phase 1: Experiential sliders */}
        <ExperientialSurveyModal
          album={currentAlbum}
          isOpen={showSurveyModal}
          onClose={() => setShowSurveyModal(false)}
          onSurveyComplete={handleSurveyComplete}
        />

        {/* Error Message */}
        {error && (
          <Box
            sx={{
              mb: 2,
              backgroundColor: '#ffb6c1',
              border: '1px solid #ff69b4',
              padding: 1,
              borderRadius: '2px',
            }}
          >
            <Typography sx={{ fontSize: '11px', color: '#c00' }}>
              {error}
            </Typography>
          </Box>
        )}

        {/* Navigation Buttons */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 1,
          }}
        >
          <Button
            variant="outlined"
            size="small"
            onClick={handleNavigateBack}
            disabled={currentAlbumIndex === 0}
            sx={{
              fontSize: '11px',
              textTransform: 'none',
              padding: '4px 12px',
              backgroundColor: '#c0c0c0',
              border: '2px solid',
              borderColor: currentAlbumIndex === 0 ? '#dfdfdf #808080 #808080 #dfdfdf' : '#ffffff #808080 #808080 #ffffff',
              color: currentAlbumIndex === 0 ? '#999' : '#000',
              '&:hover:not(:disabled)': {
                backgroundColor: '#dfdfdf',
              },
            }}
          >
            ← Back
          </Button>

          <Button
            variant="outlined"
            size="small"
            onClick={handleSkipOnboarding}
            sx={{
              fontSize: '11px',
              textTransform: 'none',
              padding: '4px 12px',
              backgroundColor: '#c0c0c0',
              border: '2px solid',
              borderColor: '#ffffff #808080 #808080 #ffffff',
              '&:hover': {
                backgroundColor: '#dfdfdf',
              },
            }}
          >
            Skip All
          </Button>

          <Button
            variant="outlined"
            size="small"
            onClick={handleNavigateNext}
            disabled={isOnLastAlbum}
            sx={{
              fontSize: '11px',
              textTransform: 'none',
              padding: '4px 12px',
              backgroundColor: '#c0c0c0',
              border: '2px solid',
              borderColor: isOnLastAlbum ? '#dfdfdf #808080 #808080 #dfdfdf' : '#ffffff #808080 #808080 #ffffff',
              color: isOnLastAlbum ? '#999' : '#000',
              '&:hover:not(:disabled)': {
                backgroundColor: '#dfdfdf',
              },
            }}
          >
            Next →
          </Button>
        </Box>

        {/* Manual Analyze Button (shown when 5+ surveys completed) */}
        {completedCount >= minSurveysNeeded && (
          <Box sx={{ mt: 2 }}>
            <Button
              variant="contained"
              size="small"
              onClick={async () => {
                setIsAnalyzing(true);
                try {
                  await apiClient.analyzeTaste();
                  sessionStorage.removeItem('onboarding');
                  onComplete();
                } catch (err) {
                  setError('Failed to analyze profile. Please try again.');
                  setIsAnalyzing(false);
                }
              }}
              disabled={isAnalyzing}
              sx={{
                fontSize: '11px',
                textTransform: 'none',
                padding: '6px 16px',
                width: '100%',
                backgroundColor: '#7B5BA8',
                color: '#fff',
                border: '2px solid',
                borderColor: '#ffffff #4a3866 #4a3866 #ffffff',
                fontWeight: 'bold',
                '&:hover:not(:disabled)': {
                  backgroundColor: '#9b7bc8',
                },
                '&:disabled': {
                  backgroundColor: '#7B5BA8',
                  color: '#ccc',
                },
              }}
            >
              {isAnalyzing ? 'Analyzing...' : '✓ Analyze Profile Now'}
            </Button>
            <Typography sx={{ fontSize: '10px', color: '#555', mt: 1, textAlign: 'center' }}>
              You've completed {completedCount} surveys! Click above to generate your taste profile.
            </Typography>
          </Box>
        )}

        {/* Footer Message */}
        <Typography
          sx={{
            fontSize: '10px',
            color: '#555',
            mt: completedCount >= minSurveysNeeded ? 1 : 2,
            textAlign: 'center',
          }}
        >
          Let's understand your taste in music!
        </Typography>
      </Box>
    </Box>
  );
};
