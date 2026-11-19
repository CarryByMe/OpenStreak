# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v58.0.0/ before writing any code.
The project is on **Expo SDK 58** (React Native 0.88). Install native modules with `npx expo install`
so versions match `expo/bundledNativeModules.json`; never bump `expo` to another major by hand.

# Architecture

- **Data lives in `src/core`** (model v2). `model.ts` — types; every record has `id`, `createdAt`,
  `updatedAt`, `deletedAt` (soft delete — never hard-delete, sync depends on tombstones).
  Change data only through `core/actions.ts` → `store.ts#commit`.
- Storage: `core/storage` — SQLite on iOS/Android, AsyncStorage on web, `MemoryStorage` in tests.
- `core/migrate.ts` — the only place that turns outside JSON (old `CoolTick.v4` state, backups)
  into model v2. Treat all imported data as untrusted.
- Subtasks («пункты» of a task) are their own collection `subtasks` (`taskId`, `order`, `doneOn`), not an array
  inside the task: each item syncs on its own. Pure helpers in `core/subtasks.ts`; changes only through
  `actions.saveSubtasks` / `toggleSubtask` (the last checked item closes the task, undo restores both).
  `deleteTask` / `restoreTask` cascade to the items. Points are for the task only.
- Schedule («Расписание»: пары, зал, работа) is the collection `lessons` — repeating by weekday, not a task:
  no marks, points or debts. Off by default (`settings.scheduleEnabled`); bells and odd/even weeks live in
  settings too. Pure helpers in `core/schedule.ts` (time by bell number, week parity, day timeline); screens in
  `features/schedule`.
- Reminders are planned by `core/reminders.ts` (pure) and synced to the OS by
  `services/notifications.ts`; never fire reminders from timers in JS.
- Home-screen widget («Сегодня», M и L): `core/widget.ts` (pure model) → `widgets/view.ts` (texts, colours of
  one theme, JSON-serialisable) → renderers `widgets/android/TodayWidget.tsx` (`react-native-android-widget`,
  SVG from `widgets/svg.ts`) and `widgets/ios/today.tsx` (`expo-widgets`). The widget runs outside the UI
  (headless task on Android, extension on iOS): no stores, no hooks, no app imports inside it. iOS `'widget'`
  functions are stringified — they must be self-contained (everything arrives in `props`). Components of the
  Android tree must never return `null` — put the condition at the call site.
- Screens live in `src/features`, navigation in `src/navigation`. Derived values (day, streaks,
  points, task groups, goals, «Итоги» — `core/stats.ts`) are pure functions in `src/core` with tests — screens only render them.

# Rules for this repo

- **Contrast is mandatory.** Every text/background pair must pass WCAG 2.x (≥ 4.5 for normal text,
  ≥ 3 for large text and for icons, moons and other non-text marks) in **both** themes (День and Вечерний мульт). Colours live in
  `src/theme/palettes.json`; add any new pair to `checks` there and run `npm run check:contrast`.
  No `opacity` on elements that carry text — use a solid colour token instead.
- **Four designs, one icon set.** `Design` = `normal` (monolith look: soft cards, blue accent, area/habit
  colour), `minimal` (strict lines, one accent; was `plain`), `auf` («Мульт») and `gym` («Качалка»).
  Icons come only from `ui/icons/paths.ts` in all four. `isSticker(d)` = `auf` or `gym`; `usePlain()` =
  not a sticker design; `useSoft()` = `normal`; `useGym()` = `gym`. Character, quotes and ranks exist only
  in sticker designs (`core/settings.ts#hasCharacter`). Stored `design: 'plain'` is read as `minimal`
  (`core/settings.ts#designOf`).
- **Design `gym` is «Качалка»** (`design/gachi`): the «Мульт» stickers in leather, steel and brass —
  palettes `gymLight` («Бетон») / `gymDark` («Подземелье»), outline 3, near-square corners, Russo One for
  titles, Oswald for numbers, Golos Text for text. `Moon` draws a barbell plate, `Wolf` draws the gym boss
  medal (`ui/icons/GymBoss.tsx`). Its copy (ranks, the boss, «блин» instead of «луна», boss quotes) lives
  in `i18n/gym.ts` on top of the normal dictionary: `translate(..., flavor)`, `flavorOf(settings)`.
  Keep the boss an original character: no real people, nothing lewd.
- **Design `auf` is «Мульт»** (`design/mult`, rules in `ROADMAP.md` → «Принятые решения»): stickers with a
  2.5 outline and a hard shadow (`theme/sticker.ts`), tilt only on decorations (tags, badges), colour
  with meaning (sun — moon and main action, teal — done/on, red — only slips and debts). Screens use
  only `src/ui` components, tokens from `src/theme` and string keys from `src/i18n`.
- Before committing run `npm run check` (typecheck + lint + tests + contrast) and `npm run format:check`.
- Pin a known bug with `test.failing` next to the code it concerns (`__tests__`). When you fix one, turn it into a
  normal `test`.
- UI copy is Russian for now; ru/en/es localisation is planned — don't add new hard-coded strings to
  logic modules.
