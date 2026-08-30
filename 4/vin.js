const productos = [
    {
        id: 1,
        name: "Rihanna - Anti | Vinilo",
        price: 69900,
        stock: 10
    },
    {
        id: 2,
        name: "SZA - Ctrl | Vinilo",
        price: 47900,
        stock: 15
    },
    {
        id: 3,
        name: "Doja Cat - Planet Her | Vinilo",
        price: 36900,
        stock: 8
    },
    {
        id: 4,
        name: "Daniel Caesar - Ferudian | Vinilo",
        price: 56900,
        stock: 12
    },
    {
        id: 5,
        name: "Frank Ocean - channel ORANGE | Vinilo",
        price: 74900,
        stock: 10
    }
];

const carrito = [];
const productosElemento = document.getElementById("productos");
const carritoElemento = document.getElementById("carrito");
const totalElemento = document.getElementById("total");
const cantidadElemento = document.getElementById("cantidad");
const vaciarBoton = document.getElementById("vaciar");

function mostrarProductos() {
    productosElemento.innerHTML = "";

    productos.forEach((producto) => {
        const elemento = document.createElement("div");
        elemento.classList.add("producto");
        elemento.innerHTML = `
            <h3>${producto.name}</h3>
            <p>Precio: $${producto.price}</p>
            <p>Stock: ${producto.stock}</p>
            <button onclick="agregarAlCarrito(${producto.id})">Agregar al carrito</button>
        `;
        productosElemento.appendChild(elemento);
    });
}

function agregarAlCarrito(id) {
    const productoEncontrado = productos.find((producto) => producto.id === id);

    if (!productoEncontrado) {
        console.error("Producto no encontrado");
        return;
    }

    if (productoEncontrado.stock <= 0) {
        alert("Producto agotado");
        return;
    }

    const itemEnCarrito = carrito.find((producto) => producto.id === id);

    if (itemEnCarrito) {
        itemEnCarrito.cantidad += 1;
    } else {
        carrito.push({ ...productoEncontrado, cantidad: 1 });
    }

    productoEncontrado.stock -= 1;
    mostrarProductos();
    mostrarCarrito();
}

function calcularTotal() {
    return carrito.reduce((total, producto) => total + (producto.price * producto.cantidad), 0);
}

function mostrarCarrito() {
    carritoElemento.innerHTML = "";

    if (carrito.length === 0) {
        carritoElemento.innerHTML = "<p>El carrito está vacío</p>";
        totalElemento.textContent = "$0";
        cantidadElemento.textContent = "0";
        return;
    }

    carrito.forEach((producto) => {
        const elemento = document.createElement("div");
        elemento.classList.add("producto");
        elemento.innerHTML = `
            <h3>${producto.name}</h3>
            <p>Precio: $${producto.price}</p>
            <p>Cantidad: ${producto.cantidad}</p>
        `;
        carritoElemento.appendChild(elemento);
    });

    const totalCantidad = carrito.reduce((total, producto) => total + producto.cantidad, 0);
    totalElemento.textContent = `$${calcularTotal()}`;
    cantidadElemento.textContent = String(totalCantidad);
}
vaciarBoton.addEventListener("click", () => {

    carrito.length = 0;

    mostrarCarrito();

    mostrarProductos();

});
mostrarProductos();
mostrarCarrito();