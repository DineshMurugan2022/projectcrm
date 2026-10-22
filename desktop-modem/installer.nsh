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
!macroend
