console.log("CRUD START");
import fs from "fs";

const DB_FILE_PATH = "./core/db";

interface noteData {
  id: string;
  content: string;
  createdAt: Date;
}

function create(content: string) {
  const noteData: noteData = {
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

function findById(id: string) {
  if (!fs.existsSync(DB_FILE_PATH)) return { staus: 404, message: "Not found" };

  const dbFile = fs.readFileSync(DB_FILE_PATH).toString();
  const data = JSON.parse(dbFile);

  const note = data.notes.filter((note: noteData) => note.id === id);

  return note[0];
}
