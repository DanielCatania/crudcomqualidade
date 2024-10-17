console.log("CRUD START");

const fs = require("fs");
const crypto = require("crypto");
const DB_FILE_PATH = "./core/db";

function create(content) {
  const noteData = {
    id: crypto.randomUUID(),
    content,
    createdAt: new Date(),
  };
  if (!fs.existsSync(DB_FILE_PATH)) {
    const db = { notes: [noteData] };

    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(db));
  } else {
    const dbFile = fs.readFileSync(DB_FILE_PATH).toString();
    const data = JSON.parse(dbFile);
    console.log(data);

    data.notes.push(noteData);

    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data));
  }

  return noteData;
}

function readAll() {
  if (!fs.existsSync(DB_FILE_PATH))
    return { staus: 200, message: "nothing to read" };

  const file = fs.readFileSync(DB_FILE_PATH).toString();
  const data = JSON.parse(file);

  return data;
}

function findById(id) {
  if (!fs.existsSync(DB_FILE_PATH)) return { staus: 404, message: "Not found" };

  const dbFile = fs.readFileSync(DB_FILE_PATH).toString();
  const data = JSON.parse(dbFile);

  console.log(data.notes);
  const note = data.notes.filter((note) => note.id === id);

  return note;
}

function findById(id) {
  if (!fs.existsSync(DB_FILE_PATH)) return { staus: 404, message: "Not found" };

  const dbFile = fs.readFileSync(DB_FILE_PATH).toString();
  const data = JSON.parse(dbFile);

  const note = data.notes.filter((note) => note.id === id);

  return note;
}

const noteOne = create("Note 1");
const noteTwo = create("Note 2");
console.log(findById(noteOne.id));
console.log(findById(noteTwo.id));
console.log(readAll());
