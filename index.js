var Service, Characteristic, HomebridgeAPI;
var util = require('util'), exec = require('child_process').exec, child;

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  HomebridgeAPI = homebridge;
  homebridge.registerAccessory("homebridge-snooz", "Snooz", Snooz);
}

function Snooz(log, config) {
  this.log = log;
  this.name = config.name;
  this.stateful = true;
  this.reverse = false;
  this.time = 1000;
  this.fan = config.fan;
  this.host = config.host;
  this._service = new Service.Switch(this.name);

  this.cacheDirectory = HomebridgeAPI.user.persistPath();
  this.storage = require('node-persist');
  this.storage.initSync({
    dir: this.cacheDirectory,
    forgiveParseErrors: true
  });

  this._service.getCharacteristic(Characteristic.On).on('set', this._setOn.bind(this));

  var cachedState = this.storage.getItemSync(this.name);
  if ((cachedState === undefined) || (cachedState === false)) {
    this._service.setCharacteristic(Characteristic.On, false);
  } else {
    this._service.setCharacteristic(Characteristic.On, true);
  }
}

Snooz.prototype.getServices = function() {
  var informationService = new Service.AccessoryInformation();
  informationService.setCharacteristic(Characteristic.Manufacturer, "Snooz")
  informationService.setCharacteristic(Characteristic.Model, "Snooz")
  informationService.setCharacteristic(Characteristic.SerialNumber, this.fan);

  this.informationService = informationService;

  return [informationService, this._service];
}

Snooz.prototype._setOn = function(on, callback) {
  this.log("Setting Snooz to " + on);

  this.storage.setItemSync(this.name, on);

  child = exec(
    "gatttool -i hci0 -b " + this.fan + " --char-write-req -a 0x0003 -n " + this.host + (on ? "01" : "02"),
    function(error, stdout, stderr) {
      if (error !== null) {
        console.log("stderr: " + stderr);
      }
    }
  );

  callback();
}
