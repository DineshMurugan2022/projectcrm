!macro customCheckAppRunning
  # Forcefully terminate any running instances of BNY CRM or the PBX engine without directory locking
  nsExec::Exec `taskkill /F /IM "${APP_EXECUTABLE_FILENAME}" /T`
  nsExec::Exec `taskkill /F /IM "bny-pbx-engine.exe" /T`
  Sleep 500
!macroend

!macro customInstall
  CreateShortCut "$DESKTOP\BNY CRM.lnk" "$appExe" "" "$appExe" 0 "" "" "BNY CRM"
  CreateDirectory "$SMPROGRAMS\BNY CRM"
  CreateShortCut "$SMPROGRAMS\BNY CRM\BNY CRM.lnk" "$appExe" "" "$appExe" 0 "" "" "BNY CRM"

  # Register tel: URL protocol in HKCU
  WriteRegStr HKCU "Software\Classes\tel" "" "URL:tel Protocol"
  WriteRegStr HKCU "Software\Classes\tel" "URL Protocol" ""
  WriteRegStr HKCU "Software\Classes\tel\DefaultIcon" "" "$appExe,0"
  WriteRegStr HKCU "Software\Classes\tel\shell" "" "open"
  WriteRegStr HKCU "Software\Classes\tel\shell\open\command" "" '"$appExe" "%1"'

  # Register callto: URL protocol in HKCU
  WriteRegStr HKCU "Software\Classes\callto" "" "URL:callto Protocol"
  WriteRegStr HKCU "Software\Classes\callto" "URL Protocol" ""
  WriteRegStr HKCU "Software\Classes\callto\DefaultIcon" "" "$appExe,0"
  WriteRegStr HKCU "Software\Classes\callto\shell" "" "open"
  WriteRegStr HKCU "Software\Classes\callto\shell\open\command" "" '"$appExe" "%1"'

  # Register Application Capabilities for Windows 10/11 Default Apps list
  WriteRegStr HKCU "Software\BNY CRM\Capabilities" "ApplicationDescription" "BNY CRM Telecaller Suite & Phone"
  WriteRegStr HKCU "Software\BNY CRM\Capabilities" "ApplicationName" "BNY CRM"
  WriteRegStr HKCU "Software\BNY CRM\Capabilities\URLAssociations" "tel" "BNYCRM.tel"
  WriteRegStr HKCU "Software\BNY CRM\Capabilities\URLAssociations" "callto" "BNYCRM.callto"
  WriteRegStr HKCU "Software\RegisteredApplications" "BNY CRM" "Software\BNY CRM\Capabilities"

  WriteRegStr HKCU "Software\Classes\BNYCRM.tel" "" "URL:tel Protocol"
  WriteRegStr HKCU "Software\Classes\BNYCRM.tel" "URL Protocol" ""
  WriteRegStr HKCU "Software\Classes\BNYCRM.tel\DefaultIcon" "" "$appExe,0"
  WriteRegStr HKCU "Software\Classes\BNYCRM.tel\shell\open\command" "" '"$appExe" "%1"'

  WriteRegStr HKCU "Software\Classes\BNYCRM.callto" "" "URL:callto Protocol"
  WriteRegStr HKCU "Software\Classes\BNYCRM.callto" "URL Protocol" ""
  WriteRegStr HKCU "Software\Classes\BNYCRM.callto\DefaultIcon" "" "$appExe,0"
  WriteRegStr HKCU "Software\Classes\BNYCRM.callto\shell\open\command" "" '"$appExe" "%1"'
!macroend

!macro customUnInstall
  DeleteRegKey HKCU "Software\Classes\tel"
  DeleteRegKey HKCU "Software\Classes\callto"
  DeleteRegKey HKCU "Software\Classes\BNYCRM.tel"
  DeleteRegKey HKCU "Software\Classes\BNYCRM.callto"
  DeleteRegKey HKCU "Software\BNY CRM"
  DeleteRegValue HKCU "Software\RegisteredApplications" "BNY CRM"
!macroend
