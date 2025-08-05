

import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, View } from 'react-native';

interface Entity {
  id: number;
  type: 'bull' | 'obstacle';
  x: number;
  y: number;
  scale: number;
  velocityX: number; // px/sec
}

const { width, height } = Dimensions.get('window');
const topHeight = (2 / 3) * height;
const bottomHeight = height - topHeight;

const spawnPoints = Array.from({ length: 5 }, (_, i) => ({
  y: topHeight * (i / 4),
  scale: 0.6 + (i / 4) * 0.4,
}));

export default function Game() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const nextId = useRef(0);
  const lastTime = useRef<number | null>(null);
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    const spawnInterval = setInterval(spawnEntity, 1000);

    const loop = (timestamp: number) => {
      if (lastTime.current === null) lastTime.current = timestamp;
      const delta = (timestamp - lastTime.current) / 1000; // time in seconds since last frame
      lastTime.current = timestamp;

      setEntities(prev => updateEntities(prev, delta));
      rafId.current = requestAnimationFrame(loop);
    };

    rafId.current = requestAnimationFrame(loop);
	return () => {
	clearInterval(spawnInterval);
	if (rafId.current !== null) {
		cancelAnimationFrame(rafId.current);
	}
	};
  }, []);

  function spawnEntity() {
    const { y, scale } = spawnPoints[Math.floor(Math.random() * 5)];
    const isBull = Math.random() < 0.5;
    // velo px/sec
    const velocityX = isBull ? (-150 + (Math.round(Math.random() * 61)) - 30) : -300;
    setEntities(prev => [
      ...prev,
      {
        id: nextId.current++,
        type: isBull ? 'bull' : 'obstacle',
        x: width + 50,
        y,
        scale,
        velocityX,
      },
    ]);
  }

  function updateEntities(list: Entity[], delta: number) {
    return list
      .map(ent => ({
        ...ent,
        x: ent.x + ent.velocityX * delta,
      }))
      .filter(ent => ent.x + 50 > 0);
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={{ position: 'absolute', width, height: topHeight }}>
        {entities.map(ent => (
          <View
            key={ent.id}
            style={{
              position: 'absolute',
              left: ent.x,
              top: ent.y,
              width: 50 * ent.scale,
              height: 50 * ent.scale,
              backgroundColor: ent.type === 'bull' ? 'brown' : 'gray',
              borderRadius: ent.type === 'bull' ? 15 * ent.scale : 0,
            }}
          />
        ))}
      </View>
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          width,
          height: bottomHeight,
          backgroundColor: '#eee',
        }}
      />
    </View>
  );
}
