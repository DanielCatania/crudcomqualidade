console.log("CRUD START");
import fs from "fs";
import crypto from "crypto";

const DB_FILE_PATH = "./core/db";

const notFoundError = { status: 404, message: "Not found" };

function getDB() {
  try {
    const db = JSON.parse(fs.readFileSync(DB_FILE_PATH).toString());
    if (!db.toDos || !Array.isArray(db.toDos))
      throw new Error("DB not compatible");
    return db;
  } catch (error) {
    NEW_DB();
  }
}

function updateDB(data: Object) {
  if (typeof data !== "object") throw new Error("the DB must be a json object");
  fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2));
}

function NEW_DB() {
  const newDB = { toDos: [] };

  updateDB(newDB);
  return newDB;
}

interface toDo {
  id: string;
  content: string;
  createdAt: string;
  isDone: boolean;
}

function createToDo(content: string) {
  const toDo: toDo = {
    id: crypto.randomUUID(),
    content,
    createdAt: new Date().toISOString(),
    isDone: false,
  };

  const db = getDB();

  db.toDos.push(toDo);
  updateDB(db);

  return toDo;
}

function readAllToDos() {
  const db = getDB();

  return db.toDos;
}

function findToDoById(id: string) {
  const db = getDB();

  const toDo = db.toDos.find((toDo: toDo) => toDo.id === id);

  if (!toDo) return notFoundError;

  return toDo;
}

function changeIsDoneById(id: string) {
  const toDo = findToDoById(id);

  if (toDo === notFoundError) return notFoundError;

  const db = getDB();
  const index = db.toDos.findIndex(
    (toDoInTest: toDo) => toDoInTest.id === toDo.id
  );

  toDo.isDone = !toDo.isDone;
  db.toDos[index] = toDo;

  updateDB(db);

  return toDo;
}

// NEW_DB();
// console.log(readAllToDos());

// const { id } = createToDo("One");
// createToDo("Two");
// console.log(readAllToDos());

// console.log(findToDoById("One")); //  error
// console.log(changeIsDoneById("One")); //  error

// console.log(findToDoById(id));
// changeIsDoneById(id);
// console.log(readAllToDos());

// changeIsDoneById(id);
// console.log(findToDoById(id));
