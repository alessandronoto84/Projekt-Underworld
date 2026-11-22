import { Game } from './game/game';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const game = new Game(canvas);
game.start();

// Für Entwicklung/Tests im Browser erreichbar machen.
(window as unknown as { underworld: Game }).underworld = game;
