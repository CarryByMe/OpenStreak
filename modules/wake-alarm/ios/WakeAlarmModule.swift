// Будильник до пар на iOS: настоящие будильники AlarmKit (iOS 26+) — звонят сквозь беззвучный
// режим и «Фокус», на весь экран. План (когда и с какой подписью) считает приложение
// (`core/schedule.ts#wakePlan`); модуль только приводит будильники системы к плану.
// На iOS ниже 26 и при сборке без SDK с AlarmKit функции отвечают «unsupported».
import ExpoModulesCore

#if canImport(AlarmKit)
import ActivityKit
import AlarmKit
import CryptoKit
import SwiftUI
#endif

/** Один будильник плана: стабильный ключ, момент (мс с эпохи) и подпись. */
struct WakeAlarmRecord: Record {
  @Field
  var id: String = ""
  @Field
  var at: Double = 0
  @Field
  var title: String = ""
}

public class WakeAlarmModule: Module {
  public func definition() -> ModuleDefinition {
    Name("WakeAlarm")

    /** "authorized" | "denied" | "notDetermined" | "unsupported" */
    Function("authorizationState") { () -> String in
      #if canImport(AlarmKit)
      if #available(iOS 26.0, *) {
        return WakeAlarmScheduler.stateName(AlarmManager.shared.authorizationState)
      }
      #endif
      return "unsupported"
    }

    AsyncFunction("requestAuthorization") { () async throws -> String in
      #if canImport(AlarmKit)
      if #available(iOS 26.0, *) {
        let state = try await AlarmManager.shared.requestAuthorization()
        return WakeAlarmScheduler.stateName(state)
      }
      #endif
      return "unsupported"
    }

    /** Привести будильники приложения к плану: лишние снять, недостающие поставить. Возвращает, сколько поставлено. */
    AsyncFunction("sync") { (alarms: [WakeAlarmRecord]) async throws -> Int in
      let items = alarms.map { WakeAlarmItem(key: $0.id, at: $0.at, title: $0.title) }
      #if canImport(AlarmKit)
      if #available(iOS 26.0, *) {
        return try await WakeAlarmScheduler.sync(items)
      }
      #endif
      return 0
    }
  }
}

struct WakeAlarmItem: Sendable {
  let key: String
  let at: Double
  let title: String
}

#if canImport(AlarmKit)
@available(iOS 26.0, *)
struct WakeAlarmMetadata: AlarmMetadata {}

@available(iOS 26.0, *)
enum WakeAlarmScheduler {
  static func stateName(_ state: AlarmManager.AuthorizationState) -> String {
    switch state {
    case .authorized: return "authorized"
    case .denied: return "denied"
    case .notDetermined: return "notDetermined"
    @unknown default: return "denied"
    }
  }

  /** Постоянный UUID для ключа плана: одинаковый будильник не ставится дважды. */
  static func uuid(for key: String) -> UUID {
    var bytes = Array(Insecure.MD5.hash(data: Data("openstreak.wake.\(key)".utf8)))
    bytes[6] = (bytes[6] & 0x0F) | 0x30  // версия 3 (MD5)
    bytes[8] = (bytes[8] & 0x3F) | 0x80  // вариант RFC 4122
    return UUID(uuid: (
      bytes[0], bytes[1], bytes[2], bytes[3], bytes[4], bytes[5], bytes[6], bytes[7],
      bytes[8], bytes[9], bytes[10], bytes[11], bytes[12], bytes[13], bytes[14], bytes[15]
    ))
  }

  static func sync(_ items: [WakeAlarmItem]) async throws -> Int {
    let manager = AlarmManager.shared
    guard manager.authorizationState == .authorized else { return 0 }

    var wanted: [UUID: WakeAlarmItem] = [:]
    for item in items { wanted[uuid(for: item.key)] = item }

    // Все будильники AlarmKit этого приложения — наши: лишние снимаем.
    let existing = Set(try manager.alarms.map { $0.id })
    for id in existing where wanted[id] == nil {
      try? manager.cancel(id: id)
    }

    var scheduled = 0
    let now = Date()
    for (id, item) in wanted where !existing.contains(id) {
      let date = Date(timeIntervalSince1970: item.at / 1000)
      if date <= now { continue }
      let title: LocalizedStringResource = "\(item.title)"
      let alert = AlarmPresentation.Alert(
        title: title,
        secondaryButton: nil,
        secondaryButtonBehavior: nil
      )
      let attributes = AlarmAttributes<WakeAlarmMetadata>(
        presentation: AlarmPresentation(alert: alert),
        metadata: nil,
        tintColor: Color.blue
      )
      let configuration = AlarmManager.AlarmConfiguration<WakeAlarmMetadata>.alarm(
        schedule: .fixed(date),
        attributes: attributes,
        stopIntent: nil,
        secondaryIntent: nil,
        sound: .default
      )
      _ = try await manager.schedule(id: id, configuration: configuration)
      scheduled += 1
    }
    return scheduled
  }
}
#endif
