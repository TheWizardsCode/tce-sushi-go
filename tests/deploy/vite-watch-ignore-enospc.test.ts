/**
 * Regression guard: the checked-in `vite.config.ts` must wire the shared
 * watch-ignore list into the Vite file watcher so main-checkout dev servers
 * and test runs stop exhausting `fs.inotify.max_user_watches` (ENOSPC).
 *
 * Background (MS-0MV8M9IAF000KPNY, port MS-0MVBEQ6MC004WRI0): the Vite/Vitest
 * file watcher recursively traverses `.worklog/worktrees/**`, so a dev server
 * or full-suite run from a checkout with accumulated worktrees fails with
 * repeated `ENOSPC: System limit for number of file watchers reached`. The core
 * scaffold template emits a `server.watch.ignored` guard (CG-0MV5SEHHG000ZKUA);
 * this file asserts the real, checked-in config carries that same guard.
 *
 * Static assertions only — mirrors the static half of tce-main-street's
 * `tests/deploy/vite-watch-ignore-enospc.test.ts`; the in-process dev-server
 * smoke stays there (one per host, not one per sibling repo, to avoid eight
 * extra dev-server startups under suite contention).
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { DEV_WATCH_IGNORE_PATTERNS } from '@core-scripts/vite-transcript-plugin';

const REPO_ROOT = process.cwd();
const CONFIG_PATH = path.join(REPO_ROOT, 'vite.config.ts');

describe('vite.config.ts watch-ignore ENOSPC guard', () => {
  it('wires the shared ignore list into server.watch.ignored', () => {
    const src = fs.readFileSync(CONFIG_PATH, 'utf-8');
    // The real config must carry the same guard the core template emits
    // (CG-0MV5SEHHG000ZKUA) — importing the shared list and spreading it into
    // the watcher's ignored array.
    expect(src).toMatch(
      /import \{[^}]*DEV_WATCH_IGNORE_PATTERNS[^}]*\} from '\.\/core\/scripts\/vite-transcript-plugin'/,
    );
    expect(src).toContain('ignored: [...DEV_WATCH_IGNORE_PATTERNS]');
  });

  it('the shared ignore list covers .worklog (the ENOSPC failure mode)', () => {
    // The failure mode: a recursive watch over .worklog/worktrees/** exhausts
    // the machine-wide inotify budget. The shared core list must cover it.
    expect(DEV_WATCH_IGNORE_PATTERNS).toContain('**/.worklog/**');
    // The dev-output trees stay excluded too (no regression to
    // data/tmp/results/dist handling).
    expect(DEV_WATCH_IGNORE_PATTERNS).toContain('**/data/**');
    expect(DEV_WATCH_IGNORE_PATTERNS).toContain('**/tmp/**');
    expect(DEV_WATCH_IGNORE_PATTERNS).toContain('**/results/**');
    expect(DEV_WATCH_IGNORE_PATTERNS).toContain('**/dist/**');
  });
});
