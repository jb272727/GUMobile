// apps/mobile/index.tsx
// Simplified to only export the GameScreen component in a functional component returning JSX

import * as ScreenOrientation from 'expo-screen-orientation';
import React, { useEffect } from 'react';
import GameScreen from './game';

export default function GamePage() {
	useEffect(() => {
		// Lock to landscape (both left & right)
		ScreenOrientation.lockAsync(
		ScreenOrientation.OrientationLock.LANDSCAPE
		);
	}, []);

	return (
		<>
		<GameScreen />
		</>
	);
}
