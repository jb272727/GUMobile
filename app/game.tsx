import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
	Animated,
	PanResponder,
	Text,
	useWindowDimensions,
	View,
	Image,
} from 'react-native';

import cactusImg from '../assets/game/cactus.png';
import bagImg from '../assets/game/bag.png';

interface Entity {
	id: number;
	type: 'bull' | 'obstacle';
	x: number;
	y: number;
	scale: number;
	velocityX: number; // px/sec
}

interface Captured {
	id: number;
	anim: Animated.ValueXY;
	scale: number;
	type: 'bull' | 'obstacle';
}

const SPRITE_SIZE = 50;
const spriteW = SPRITE_SIZE * 2;
const spriteH = SPRITE_SIZE * 20;

export default function Game() {
	const { width, height } = useWindowDimensions();

	const [score, setScore] = useState(0);
	const [lives, setLives] = useState(3);
	const [entities, setEntities] = useState<Entity[]>([]);
	const nextId = useRef(0);

	const [captured, setCaptured] = useState<Captured[]>([]);
	// timing
	const lastTime = useRef<number | null>(null);
	const rafId = useRef<number | null>(null);

	// lasso 
	const lassoY = useRef(new Animated.Value(950)).current;
	const lassoX = useRef(new Animated.Value(0)).current;

	// track current offsets - x already tracked
	const startAbs = useRef(0);
	const currentX = useRef(0);
	useEffect(() => {
		const id = lassoX.addListener(({ value }) => {
			currentX.current = value;
		});
		return () => lassoX.removeListener(id);
	}, [lassoX]);

	const currentY = useRef(950); 
	useEffect(() => {
		const id = lassoY.addListener(({ value }) => {
			currentY.current = value;
		});
		return () => lassoY.removeListener(id);
	}, [lassoY]);

	const [isThrowing, setIsThrowing] = useState(false);

	// split the screen
	const { topHeight, bottomHeight, spawnPoints } = useMemo(() => {
		const th = (2 / 3) * height;
		const bh = height - th;
		const usable = th - 2 * SPRITE_SIZE;
		const sp = Array.from({ length: 5 }, (_, i) => ({
			y: usable * (i / 4),
			scale: 1,
		}));
		return { topHeight: th, bottomHeight: bh, spawnPoints: sp };
	}, [height]);

	// left edge anchor
	const staticLeft = 0;

	// swipe up gesture recog
	const panResponder = useMemo(
		() =>
			PanResponder.create({
				onMoveShouldSetPanResponder: () => !isThrowing,
				onPanResponderGrant: () => {
					startAbs.current = staticLeft + currentX.current;
				},
				onPanResponderMove: (_, gs) => {
					if (!isThrowing) {
						const desiredAbs = startAbs.current + gs.dx;
						const clamped = Math.max(0, Math.min(width - spriteW, desiredAbs));
						lassoX.setValue(clamped);
					}
				},
				onPanResponderRelease: (_, gs) => {
					if (gs.dy < -50 || gs.vy < -0.5) {
						setIsThrowing(true);
						runThrow();
					}
				},
			}),
		[isThrowing, width]
	);

	function runThrow() {
		Animated.sequence([
			Animated.timing(lassoY, {
				toValue: 0,
				duration: 200,
				useNativeDriver: true,
			}),
			Animated.timing(lassoY, {
				toValue: 950,
				duration: 300,
				useNativeDriver: true,
			}),
		]).start(() => {
			setIsThrowing(false);
			lassoY.setValue(950);
			currentY.current = 950; 
		});
	}

	// Main loop
	useEffect(() => {
		function spawn() {
			const { y, scale } =
				spawnPoints[Math.floor(Math.random() * spawnPoints.length)];
			const isBull = Math.random() < 0.5;
			const vx = isBull ? -(150 + Math.random() * 60 - 30) : -300;
			setEntities(prev => [
				...prev,
				{
					id: nextId.current++,
					type: isBull ? 'bull' : 'obstacle',
					x: width + SPRITE_SIZE,
					y,
					scale,
					velocityX: vx,
				},
			]);
		}

		function loop(ts: number) {
			if (lastTime.current == null) lastTime.current = ts;
			const delta = (ts - lastTime.current) / 1000;
			lastTime.current = ts;

			// transformations
			const bottomOffset = bottomHeight - SPRITE_SIZE * 2;       
			const lassoTopStatic = height - bottomOffset - spriteH;        
			const lassoLeft = staticLeft + currentX.current;
			const lassoTop = lassoTopStatic + currentY.current;        
			const lassoRight = lassoLeft + spriteW;
			const lassoBottom = lassoTop + spriteH;

			const anchorX = lassoLeft + SPRITE_SIZE;
			const anchorY = lassoTop + 5;

			setEntities(prev => {
				const survivors: Entity[] = [];
				const newCaptured: Captured[] = [];

				prev.forEach(ent => {
					const nx = ent.x + ent.velocityX * delta;
					// off‐screen check
					if (nx + SPRITE_SIZE * ent.scale < 0) return;

					// entity bounds
					const entLeft = nx;
					const entRight = nx + SPRITE_SIZE * ent.scale;
					const entTop = ent.y;
					const entBottom = ent.y + SPRITE_SIZE * ent.scale;

					// AABB collision test with lasso rect
					const hit =
						entRight >= lassoLeft &&
						entLeft <= lassoRight &&
						entBottom >= lassoTop &&
						entTop <= lassoBottom;

					if (hit) {
						// spawn an anim at the entity's current spot
						const anim = new Animated.ValueXY({ x: nx, y: ent.y });
						newCaptured.push({ id: ent.id, anim, scale: ent.scale, type: ent.type });
					} else {
						survivors.push({ ...ent, x: nx });
					}
				});

				// trigger capture animations
				setCaptured(cur => {
					newCaptured.forEach(c => {
						Animated.spring(c.anim, {
							toValue: {
								x: anchorX - (SPRITE_SIZE * c.scale) / 2,
								y: anchorY - (SPRITE_SIZE * c.scale) / 2,
							},
							useNativeDriver: true,
						}).start(() => {
							if (c.type === 'bull') {
                setScore(s => s + 1);
              } else {
                setLives(l => Math.max(0, l - 1));
              }
							setCaptured(latest => latest.filter(x => x.id !== c.id));
						});
					});
					return [...cur, ...newCaptured];
				});

				return survivors;
			});

			rafId.current = requestAnimationFrame(loop);
		}

		const si = setInterval(spawn, 1000);
		rafId.current = requestAnimationFrame(loop);
		return () => {
			clearInterval(si);
			if (rafId.current) cancelAnimationFrame(rafId.current);
		};
	}, [spawnPoints, width, bottomHeight, staticLeft, lassoY, height]);

	return (
		<View style={{ flex: 1 }} {...panResponder.panHandlers}>
			{/* Moving entities */}
			<View style={{ position: 'absolute', width, height: topHeight }}>
				{entities.map(ent => (
					<Image
						key={ent.id}
						source={ent.type === 'bull' ? bagImg : cactusImg}
						resizeMode="contain"
						style={{
							position: 'absolute',
							left: ent.x,
							top: ent.y,
							width: SPRITE_SIZE * ent.scale,
							height: SPRITE_SIZE * ent.scale,
						}}
					/>
				))}
			</View>

			{/* Bottom third */}
			<View
				style={{
					position: 'absolute',
					bottom: 0,
					width,
					height: bottomHeight,
					backgroundColor: '#eee',
				}}
			/>

			{/* Captured animations */}
			{captured.map(c => (
				<Animated.Image
					key={c.id}
					source={c.type === 'bull' ? bagImg : cactusImg}
					resizeMode="contain"
					style={{
						position: 'absolute',
						width: SPRITE_SIZE * c.scale,
						height: SPRITE_SIZE * c.scale,
						transform: c.anim.getTranslateTransform(),
						zIndex: 5,
					}}
				/>
			))}

			{/* lasso */}
			<Animated.View
				style={{
					position: 'absolute',
					left: staticLeft,
					bottom: bottomHeight - SPRITE_SIZE * 2,
					transform: [{ translateX: lassoX }, { translateY: lassoY }],
					width: spriteW,
					height: spriteH,
					backgroundColor: 'rgba(0,0,0,0.1)',
					zIndex: 10,
				}}
			>
				{/* top‐middle anchor */}
				<View
					style={{
						position: 'absolute',
						top: 0,
						left: SPRITE_SIZE - 5,
						width: 10,
						height: 10,
						borderRadius: 5,
						backgroundColor: 'red',
					}}
				/>
			</Animated.View>

			{/* Score & Lives */}
			<View
				style={{
					position: 'absolute',
					bottom: 10,
					right: 10,
					flexDirection: 'row',
					alignItems: 'center',
				}}
			>
				<Text style={{ marginRight: 20, fontSize: 16 }}>Score: {score}</Text>
				<Text style={{ fontSize: 16 }}>Lassos: {lives}</Text>
			</View>
		</View>
	);
}
