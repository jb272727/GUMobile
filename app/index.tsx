// apps/mobile/index.tsx
// Simplified to only export the GameScreen component in a functional component returning JSX

import React from 'react';
import GameScreen from './game';

export default function GamePage() {
  return (
    <>
      <GameScreen />
    </>
  );
}
