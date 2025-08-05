// apps/mobile/index.tsx
import React, { useState, useEffect } from 'react';
import {
	SafeAreaView,
	ScrollView,
	View,
	Text,
	StyleSheet,
	Pressable,
	Modal,
	Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import GameScreen from './game';

// @TODO for game: haptics (disable in game settings (also disable music here)), change bg in settings,
// more enemies, sparser platforms according to difficulty, doodle-jump-like trampolines.
// log platform list to ensure we're keeping a healthly list and not slowly gaining more and more platforms over time

export default function HostPage() {
	console.log("host page");
	const [isGameVisible, setGameVisible] = useState(false);

	const scrollEnabled = !isGameVisible;

	useEffect(() => {
		const interval = setInterval(() => {
			console.log('scrollEnabled:', scrollEnabled);
		}, 1000);
		return () => clearInterval(interval);
	}, [scrollEnabled]);

	return (
		<SafeAreaView style={styles.safeArea}>
			<ScrollView
				contentContainerStyle={styles.container}
				scrollEnabled={scrollEnabled}
			>
				<Text style={styles.header}>My Awesome Page</Text>

				<Pressable
					style={styles.playButton}
					onPress={() => setGameVisible(true)}
				>
					<Text style={styles.playButtonText}>
						Simulate EE button press
					</Text>
				</Pressable>
			</ScrollView>

			<Modal
				visible={isGameVisible}
				transparent
				animationType="fade"
				onRequestClose={() => setGameVisible(false)}
			>
				<View style={styles.overlay}>
					{ BlurView ? (
						<BlurView
							intensity={60}
							tint="dark"
							style={StyleSheet.absoluteFill}
						/>
					) : (
						<View
							style={[
								StyleSheet.absoluteFill,
								{ backgroundColor: 'rgba(0,0,0,0.6)' }
							]}
						/>
					)}

					<View style={styles.modalContent}>
						<Pressable
							style={styles.settingsButton}
							onPress={() => {
								// TODO: open Settings
							}}
						>
							<Text style={styles.settingsText}>⚙︎</Text>
						</Pressable>

						<Pressable
							style={styles.closeButton}
							onPress={() => setGameVisible(false)}
						>
							<Text style={styles.closeText}>✕</Text>
						</Pressable>

						<View style={styles.gameWrapper}>
							<GameScreen backgroundImage={require('../assets/images/bg.png')} />
						</View>
					</View>
				</View>
			</Modal>
		</SafeAreaView>
	);
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
	safeArea: { flex: 1, backgroundColor: '#f0f0f0' },
	container: { padding: 20, paddingBottom: 40 },

	header: {
		fontSize: 24,
		fontWeight: 'bold',
		marginBottom: 20,
		textAlign: 'center',
	},
	playButton: {
		marginTop: 30,
		backgroundColor: '#007AFF',
		padding: 14,
		borderRadius: 8,
		alignItems: 'center',
	},
	playButtonText: {
		color: '#fff',
		fontSize: 18,
		fontWeight: '600',
	},

	overlay: {
		...StyleSheet.absoluteFillObject,
		justifyContent: 'center',
		alignItems: 'center',
	},
	modalContent: {
		width: width * 0.9,
		height: height * 0.8,
		borderRadius: 12,
		overflow: 'hidden',
		backgroundColor: 'transparent',
	},

	closeButton: {
		position: 'absolute',
		top: 10,
		right: 10,
		zIndex: 10,
		backgroundColor: 'rgba(0,0,0,0.7)',
		borderRadius: 20,
		padding: 6,
	},
	closeText: { color: '#fff', fontSize: 16 },

	settingsButton: {
		position: 'absolute',
		top: 10,
		left: 10,
		zIndex: 10,
		backgroundColor: 'rgba(0,0,0,0.7)',
		borderRadius: 20,
		padding: 6,
	},
	settingsText: { color: '#fff', fontSize: 16 },

	gameWrapper: {
		flex: 1,
		backgroundColor: '#000',
	},
});
