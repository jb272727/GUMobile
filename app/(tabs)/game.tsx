// apps/mobile/game.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
	Dimensions,
	PanResponder,
	StyleSheet,
	Text,
	View,
	ImageBackground,
	ImageSourcePropType,
} from 'react-native';

const GAME_WIDTH = 360;
const GAME_HEIGHT = 640;
const PLAYER_SIZE = 40;
const PLATFORM_WIDTH = 70;
const PLATFORM_HEIGHT = 16;
const GRAVITY = 0.5;
const BOUNCE_VELOCITY = -12;
const PLATFORM_SPACING = 120;
const INITIAL_PLATFORM_COUNT = 8;
const GROUND_PLATFORM_Y = GAME_HEIGHT - 30;
const INITIAL_Y = GROUND_PLATFORM_Y - PLAYER_SIZE;

function getRandomX() {
	return Math.random() * (GAME_WIDTH - PLATFORM_WIDTH);
}

function generatePlatforms(startY = GROUND_PLATFORM_Y, count = INITIAL_PLATFORM_COUNT) {
	const platforms = [];
	// Cover the ground with platforms
	for (let x = 0; x < GAME_WIDTH; x += PLATFORM_WIDTH) {
		platforms.push({ x, y: GROUND_PLATFORM_Y, id: `ground-${x}` });
	}
	// Scatter extra platforms
	let y = startY - PLATFORM_SPACING;
	for (let i = 0; i < count; i++) {
		platforms.push({ x: getRandomX(), y, id: `p-${i}` });
		y -= PLATFORM_SPACING;
	}
	return platforms;
}

interface GameScreenProps {
	backgroundImage: ImageSourcePropType;
}

export default function GameScreen({ backgroundImage }: GameScreenProps) {
	const [player, setPlayer] = useState({
		x: GAME_WIDTH / 2 - PLAYER_SIZE / 2,
		y: INITIAL_Y,
		vy: 0,
	});
	const [platforms, setPlatforms] = useState(() => generatePlatforms());
	const [cameraY, setCameraY] = useState(0);
	const [gameOver, setGameOver] = useState(false);
	const nextPlatformId = useRef(INITIAL_PLATFORM_COUNT + 1);
	const [score, setScore] = useState(0);
	const bestY = useRef(INITIAL_Y);

	// keep a ref of the latest player.x to stop teleporting
	const playerXRef = useRef(player.x);
	useEffect(() => {
		playerXRef.current = player.x;
	}, [player.x]);

	const dragging = useRef(false);
	const playerStartX = useRef(0);

	// Scale to device width
	const { width: deviceWidth } = Dimensions.get('window');
	const scale = deviceWidth / GAME_WIDTH;

	// PanResponder for drag controls
	const panResponder = useRef(
		PanResponder.create({
			onStartShouldSetPanResponder: () => true,
			onPanResponderGrant: () => {
				dragging.current = true;
				playerStartX.current = playerXRef.current;
			},
			onPanResponderMove: (_evt, gestureState) => {
				if (!dragging.current) return;
				const unscaledDx = gestureState.dx / scale;
				let newX = playerStartX.current + unscaledDx;
				newX = Math.max(0, Math.min(GAME_WIDTH - PLAYER_SIZE, newX));
				setPlayer(prev => ({ ...prev, x: newX }));
			},
			onPanResponderRelease: () => {
				dragging.current = false;
			},
			onPanResponderTerminate: () => {
				dragging.current = false;
			},
		})
	).current;

	// Game loop
	useEffect(() => {
		if (gameOver) return;
		let animation: number;
		const loop = () => {
			setPlayer(prev => {
				let { x, y, vy } = prev;
				vy += GRAVITY;
				y += vy;

				if (y < bestY.current) {
					bestY.current = y;
					const climbed = INITIAL_Y - bestY.current;
					setScore(Math.floor(climbed / 100));
				}

				for (const plat of platforms) {
					const onPlatform =
						vy > 0 &&
						y + PLAYER_SIZE >= plat.y &&
						y + PLAYER_SIZE <= plat.y + PLATFORM_HEIGHT &&
						x + PLAYER_SIZE > plat.x &&
						x < plat.x + PLATFORM_WIDTH;
					if (onPlatform) {
						vy = BOUNCE_VELOCITY;
						y = plat.y - PLAYER_SIZE;
						break;
					}
				}

				const cameraTargetY = prev.y - GAME_HEIGHT / 2;
				if (cameraTargetY < cameraY) {
					setCameraY(cameraTargetY);
				}

				if (y - cameraY > GAME_HEIGHT + 100) {
					setGameOver(true);
				}

				return { x, y, vy };
			});

			setPlatforms(prevPlatforms => {
				const newPlatforms = [...prevPlatforms];
				let minY = Math.min(...prevPlatforms.map(p => p.y));

				while (minY > cameraY - 2 * GAME_HEIGHT) {
					const baseId = nextPlatformId.current++;
					const newY = minY - PLATFORM_SPACING;
					newPlatforms.push({ x: getRandomX(), y: newY, id: `p-${baseId}` });
					minY = newY;

					const r = Math.random();
					if (r < 0.4) {
						const offset = r < 0.2 ? 40 : -40;
						const extraId = nextPlatformId.current++;
						newPlatforms.push({
							x: getRandomX(),
							y: minY - (Math.random() * 10) - offset,
							id: `p-${extraId}`,
						});
					}
				}

				const deathThreshold = cameraY + GAME_HEIGHT + 100;
				return newPlatforms.filter(p => p.y < deathThreshold);
			});

			animation = requestAnimationFrame(loop);
		};
		animation = requestAnimationFrame(loop);
		return () => cancelAnimationFrame(animation);
	}, [platforms, cameraY, gameOver]);

	// restart
	const restart = () => {
		setPlayer({
			x: GAME_WIDTH / 2 - PLAYER_SIZE / 2,
			y: GROUND_PLATFORM_Y - PLAYER_SIZE,
			vy: 0,
		});
		setPlatforms(generatePlatforms());
		setCameraY(0);
		setGameOver(false);
	};

	return (
		<View style={styles.container} {...panResponder.panHandlers}>
			<ImageBackground
				source={backgroundImage}
				style={{
					width: GAME_WIDTH * scale,
					height: GAME_HEIGHT * scale,
					overflow: 'hidden',
					position: 'relative',
				}}
				resizeMode="cover"
			>
				<Text style={styles.scoreText}>Score: {score}</Text>

				{platforms.map(plat => (
					<View
						key={plat.id}
						style={[
							styles.platform,
							{
								left: plat.x * scale,
								top: (plat.y - cameraY) * scale,
								width: PLATFORM_WIDTH * scale,
								height: PLATFORM_HEIGHT * scale,
							},
						]}
					/>
				))}

				<View
					style={[
						styles.player,
						{
							left: player.x * scale,
							top: (player.y - cameraY) * scale,
							width: PLAYER_SIZE * scale,
							height: PLAYER_SIZE * scale,
						},
					]}
				/>

				{gameOver && (
					<View
						style={[
							styles.gameOverOverlay,
							{
								top: (GAME_HEIGHT / 2 - 60) * scale,
								width: GAME_WIDTH * scale,
							},
						]}
					>
						<Text style={styles.gameOverText}>Game Over</Text>
						<Text style={styles.restartText} onPress={restart}>
							Tap to Restart
						</Text>
					</View>
				)}
			</ImageBackground>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#222',
		alignItems: 'flex-start',
		justifyContent: 'center',
	},
	player: {
		position: 'absolute',
		backgroundColor: '#1976d2',
		borderRadius: 20,
		borderWidth: 2,
		borderColor: '#fff',
	},
	platform: {
		position: 'absolute',
		backgroundColor: '#43a047',
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#fff',
	},
	gameOverOverlay: {
		position: 'absolute',
		left: 0,
		top: GAME_HEIGHT / 2 - 60,
		width: GAME_WIDTH,
		alignItems: 'center',
		backgroundColor: 'rgba(0,0,0,0.5)',
		padding: 20,
	},
	gameOverText: {
		color: '#fff',
		fontSize: 32,
		fontWeight: 'bold',
		marginBottom: 10,
	},
	restartText: {
		color: '#fff',
		fontSize: 20,
		textDecorationLine: 'underline',
	},
	scoreText: {
		position: 'absolute',
		top: 10,
		left: 10,
		fontSize: 18,
		color: '#000',
		fontWeight: 'bold',
	},
});
