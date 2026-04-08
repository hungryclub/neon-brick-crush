import registerProviders from './register-providers';
import mountGameShell from './mount-game-shell';

export default function createApp() {
  return registerProviders(mountGameShell());
}
