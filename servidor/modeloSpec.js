const modelo = require("./modelo.js");

describe("El sistema...", function () {
  let sistema;
  beforeEach(function () {
    sistema = new modelo.Sistema();
  });

  it("Agregar usuario", function () {
    let usuarios_iniciales = sistema.numeroUsuarios().num;
    sistema.agregarUsuario("juan");
    expect(sistema.numeroUsuarios().num).toEqual(usuarios_iniciales + 1);
  });

  it("Eliminar usuario", function () {
    sistema.agregarUsuario("maria");
    sistema.agregarUsuario("carlos");
    sistema.eliminarUsuario("maria");
    expect(sistema.numeroUsuarios().num).toEqual(1);
  });

  it("Obtener usuarios", function () {
    sistema.agregarUsuario("luis");
    expect(sistema.numeroUsuarios().num).toEqual(1);
  });

  it("Verificar usuario activo", function () {
    sistema.agregarUsuario("ana");
    expect(sistema.usuarioActivo("ana").nick).toEqual("ana");
  });

  it("inicialmente no hay usuarios", function () {
    expect(sistema.numeroUsuarios().num).toEqual(0);
  });
});
