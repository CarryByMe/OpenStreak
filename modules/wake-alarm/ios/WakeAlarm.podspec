# Будильник до пар: настоящие будильники через AlarmKit (iOS 26+). На iOS ниже 26 модуль
# собирается, но AlarmKit не подключён (weak framework) и функции отвечают «unsupported».
Pod::Spec.new do |s|
  s.name           = 'WakeAlarm'
  s.version        = '1.0.0'
  s.summary        = 'Wake-up alarms before the first class (AlarmKit)'
  s.description    = 'Schedules one-off system alarms with AlarmKit on iOS 26 and later.'
  s.license        = 'MIT'
  s.author         = 'OpenStreak'
  s.homepage       = 'https://github.com/CarryByMe/OpenStreak'
  s.platforms      = {
    :ios => '16.4'
  }
  s.swift_version  = '5.9'
  s.source         = { git: 'https://github.com/CarryByMe/OpenStreak.git' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.weak_frameworks = 'AlarmKit'

  s.source_files = "**/*.{h,m,swift}"
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
