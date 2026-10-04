const buttons = document.querySelectorAll(".view-button");
const views = document.querySelectorAll(".module-view");
const prism = document.querySelector(".prism");

function showView(name) {
  buttons.forEach(button => {
    button.classList.toggle("active", button.dataset.view === name);
  });

  views.forEach(view => {
    view.classList.toggle("active", view.id === `view-${name}`);
  });

  const rotations = {
    perform: "perspective(400px) rotateX(8deg) rotateY(-18deg)",
    calculate: "perspective(400px) rotateX(8deg) rotateY(0deg)",
    reference: "perspective(400px) rotateX(8deg) rotateY(18deg)"
  };

  prism.style.transform = rotations[name];
}

buttons.forEach(button => {
  button.addEventListener("click", () => showView(button.dataset.view));
});

document.querySelectorAll(".expandable").forEach(button => {
  button.addEventListener("click", () => {
    const target = document.getElementById(button.dataset.target);
    const arrow = button.querySelector("span");
    const collapsed = target.hidden;
    target.hidden = !collapsed;
    arrow.textContent = collapsed ? "▾" : "▸";
  });
});

const sampleMass = document.getElementById("sampleMass");
const volume = document.getElementById("volume");
const result = document.getElementById("result");

function calculate() {
  const mass = Number(sampleMass.value);
  const vol = Number(volume.value);

  if (mass > 0 && vol > 0) {
    result.textContent = (mass / vol).toFixed(3);
  } else {
    result.textContent = "—";
  }
}

[sampleMass, volume].forEach(input => input.addEventListener("input", calculate));

document.querySelector(".menu-button").addEventListener("click", () => {
  document.querySelector(".sidebar").classList.toggle("open");
});
