package expo.modules.wakealarm

import android.content.ActivityNotFoundException
import android.content.Intent
import android.provider.AlarmClock
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Будильник до пар на Android: будильник в системных «Часах» (AlarmClock.ACTION_SET_ALARM) —
 * звонит как обычный будильник, в том числе в беззвучном режиме. Повторяется по дням недели;
 * какие дни и во сколько, считает приложение (`core/schedule.ts#weeklyWake`).
 */
class WakeAlarmModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("WakeAlarm")

    // Разрешение AlarmKit — только на iOS; на Android будильник ставят «Часы».
    Function("authorizationState") { "unsupported" }

    /**
     * Поставить повторяющийся будильник в «Часах» без их интерфейса. `days` — дни недели
     * 0 (вс) … 6 (сб); пусто — один раз. Возвращает false, если «Часов» нет.
     */
    AsyncFunction("setSystemAlarm") { hour: Int, minute: Int, days: List<Int>, message: String ->
      val activity = appContext.currentActivity ?: throw Exceptions.MissingActivity()
      val intent = Intent(AlarmClock.ACTION_SET_ALARM).apply {
        putExtra(AlarmClock.EXTRA_HOUR, hour)
        putExtra(AlarmClock.EXTRA_MINUTES, minute)
        putExtra(AlarmClock.EXTRA_MESSAGE, message)
        putExtra(AlarmClock.EXTRA_VIBRATE, true)
        putExtra(AlarmClock.EXTRA_SKIP_UI, true)
        if (days.isNotEmpty()) {
          // В «Часах» дни — Calendar.SUNDAY (1) … Calendar.SATURDAY (7).
          putIntegerArrayListExtra(AlarmClock.EXTRA_DAYS, ArrayList(days.map { it + 1 }))
        }
      }
      try {
        activity.startActivity(intent)
        true
      } catch (e: ActivityNotFoundException) {
        false
      }
    }.runOnQueue(Queues.MAIN)

    /** Открыть список будильников в «Часах» — удалить старые после смены расписания. */
    AsyncFunction("showSystemAlarms") {
      val activity = appContext.currentActivity ?: throw Exceptions.MissingActivity()
      try {
        activity.startActivity(Intent(AlarmClock.ACTION_SHOW_ALARMS))
        true
      } catch (e: ActivityNotFoundException) {
        false
      }
    }.runOnQueue(Queues.MAIN)
  }
}
