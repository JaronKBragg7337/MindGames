import './style.css';
import { RecursiveRealityApp } from './app/RecursiveRealityApp';

void RecursiveRealityApp.create().catch((error: unknown) => {
  console.error(error);
  const fatal = document.getElementById('fatal');
  const detail = document.getElementById('fatal-detail');
  const bootStatus = document.getElementById('load-status');
  const message = error instanceof Error ? error.message : 'Unknown initialization failure.';
  fatal?.classList.remove('is-hidden');
  if (detail) detail.textContent = message;
  if (bootStatus) bootStatus.textContent = 'Initialization interrupted.';
});

