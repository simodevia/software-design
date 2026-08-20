const contador = document.getElementById("votos");
const ultimovoto = document.getElementById("último voto");
const botonesVotar = document.querySelectorAll(".votar");
const claveVotos = "cantidadVotos";

let cantidad = Number(localStorage.getItem(claveVotos)) || 0;
cantidad = 0
contador.textContent = cantidad;

botonesVotar.forEach((boton) => {
    boton.addEventListener("click", () => {
        cantidad++;
        localStorage.setItem(claveVotos, cantidad);
        contador.textContent = cantidad;
        ultimovoto.textContent = "Último voto registrado: " + boton.dataset.spiderman;
    });
});

