function selectPorts(ports, settings = {}) {
  const huawei = ports.filter(p => String(p.vendorId).toLowerCase() === '12d1' || /huawei/i.test(`${p.manufacturer || ''} ${p.friendlyName || ''}`));
  const controls = huawei.filter(p => /PC UI/i.test(p.friendlyName || ''));
  const voices = huawei.filter(p => /Application/i.test(p.friendlyName || ''));
  const control = settings.control || (controls.length === 1 ? controls[0].path : '');
  const voice = settings.voice || (voices.length === 1 ? voices[0].path : '');
  if (!control || !voice || control === voice || !huawei.some(p => p.path === control) || !huawei.some(p => p.path === voice)) {
    throw new Error('Plug in one Huawei modem, or choose its control and voice ports in Advanced settings.');
  }
  return { input: '-1', output: '-1', playback: 'low-latency', ...settings, control, voice };
}

module.exports = { selectPorts };
