console.log("CRUD START");
import fs from "fs";
import crypto from "crypto";

const DB_FILE_PATH = "./core/db";

const notFoundError = '{ status: 404, message: "Not found To Do" }';

interface IToDo {
  id: string;
  content: string;
  createdAt: string;
  isDone: boolean;
  updatedAt: string;
}

interface IUser {
  password: string;
  salt: string;
  login: string;
}

function generateSalt() {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  return btoa(String.fromCharCode(...salt));
}
function createHash(info: string, salt: string) {
  const hash = crypto
    .createHash("sha256")
    .update(info)
    .update(salt)
    .digest("hex");
  return hash;
}

function verifyString(str: string, min?: number) {
  if (
    !str ||
    typeof str !== "string" ||
    str.trim() === "" ||
    (min && str.length < min)
  ) {
    throw new Error("Invalid props");
  }
}

function createUser(login: string, password: string): IUser {
  verifyString(login, 3);
  verifyString(password, 8);

  const db = getDB();
  const isExistingUser =
    db.users.findIndex((userInTest) => userInTest.login === login) !== -1;

  if (isExistingUser) {
    throw new Error("this login is already in use");
  }

  const salt = generateSalt();
  const hashedPassword = createHash(password, salt);
  const newUser: IUser = {
    login,
    password: hashedPassword,
    salt,
  };

  db.users.push(newUser);
  updateDB(db);

  return newUser;
}

interface IDB {
  toDos: IToDo[];
  users: IUser[];
}

function getDB(): IDB {
  try {
    const db = JSON.parse(fs.readFileSync(DB_FILE_PATH).toString());
    if (!db.toDos || !Array.isArray(db.toDos))
      throw new Error("DB not compatible");
    return db;
  } catch (error) {
    return NEW_DB();
  }
}

function updateDB(data: Object): void {
  if (typeof data !== "object") throw new Error("the DB must be a json object");
  fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2));
}

function NEW_DB(): IDB {
  const newDB = { toDos: [], users: [] };

  updateDB(newDB);
  return newDB;
}

function createToDo(content: string): IToDo {
  verifyString(content);

  const toDo: IToDo = {
    id: crypto.randomUUID(),
    content,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isDone: false,
  };

  const db = getDB();

  db.toDos.push(toDo);
  updateDB(db);

  return toDo;
}

function readAllToDos(): IToDo[] {
  const db = getDB();

  return db.toDos;
}

function findToDoById(id: string): IToDo | null {
  const db = getDB();

  const toDo = db.toDos.find((toDo: IToDo) => toDo.id === id);

  return toDo || null;
}

function updateToDo(id: string, toDoUpdates: Partial<IToDo>): IToDo {
  if (toDoUpdates.id || toDoUpdates.createdAt)
    throw new Error("you can't update the id or createdAt field");

  const db = getDB();
  const toDoIndex = db.toDos.findIndex((toDo: IToDo) => toDo.id === id);

  if (toDoIndex === -1) throw new Error(notFoundError);

  const currentToDo = db.toDos[toDoIndex];
  const updatedToDo: IToDo = {
    ...currentToDo,
    ...toDoUpdates,
    updatedAt: new Date().toISOString(),
  };

  db.toDos[toDoIndex] = updatedToDo;
  updateDB(db);

  return updatedToDo;
}

function changeIsDoneById(id: string): IToDo {
  const db = getDB();
  const toDoIndex = db.toDos.findIndex((toDo: IToDo) => toDo.id === id);

  if (toDoIndex === -1) throw new Error(notFoundError);

  const currentToDo = db.toDos[toDoIndex];
  const updatedToDo: IToDo = {
    ...currentToDo,
    isDone: !currentToDo.isDone,
  };

  db.toDos[toDoIndex] = updatedToDo;
  updateDB(db);

  return updatedToDo;
}

function updateContentById(id: string, content: string): IToDo {
  return updateToDo(id, { content });
}

NEW_DB();

const user = createUser("DANIEL", "12345678");
console.log(user);

// const toDo = createToDo("To Do");
// console.log("FIRST READ", readAllToDos());

// updateToDo(toDo.id, {
//   content: "TEST",
//   isDone: true,
// });
// console.log("SECOND READ", readAllToDos());

// changeIsDoneById(toDo.id);
// console.log("THIRD READ", readAllToDos());

// updateContentById(toDo.id, "TEST 2");
// console.log("FOURTH READ", readAllToDos());
