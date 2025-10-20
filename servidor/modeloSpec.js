const modelo = require("./modelo.js");

describe("El sistema...", function () {
  let sistema;
  beforeEach(function () {
    sistema = new modelo.Sistema();
  });

  it("Agregar usuario", function () {
    let usuarios_iniciales = sistema.numeroUsuarios();
    sistema.agregarUsuario("juan");
    expect(sistema.numeroUsuarios()).toEqual(usuarios_iniciales + 1);
  });

  it("Eliminar usuario", function () {
    sistema.agregarUsuario("maria");
    sistema.agregarUsuario("carlos");
    sistema.eliminarUsuario("maria");
    expect(sistema.numeroUsuarios()).toEqual(1);
  });

  it("Obtener usuarios", function () {
    sistema.agregarUsuario("luis");
    expect(sistema.numeroUsuarios()).toEqual(1);
  });

  it("Verificar usuario activo", function () {
    sistema.agregarUsuario("ana");
    expect(sistema.usuarioActivo("ana")).toEqual(true);
  });

  it("inicialmente no hay usuarios", function () {
    expect(sistema.numeroUsuarios()).toEqual(0);
  });
});
