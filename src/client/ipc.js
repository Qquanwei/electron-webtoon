import isElectron from "is-electron";

/*
   如果在web端打开，则使用httpcontroller
 */
const controllerP = (() => {
  if (!isElectron()) {
    return import("../shared-online").then((pkg) => {
      return pkg.default;
    });
  }
  return import("../shared-electron").then((pkg) => {
    return pkg.default;
  });
})().then((ControllerCtor) => {
  return new ControllerCtor();
});

export default controllerP;
