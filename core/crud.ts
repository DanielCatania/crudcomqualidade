console.log("CRUD START");
import fs from "fs";
import crypto from "crypto";
import jwt, { JwtPayload } from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const DB_FILE_PATH = "./core/db";

const notFoundError = '{ status: 404, message: "Not found To Do" }';

interface IToDo {
  userLogin: string;
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

interface ITokens {
  accessToken: string;
  refreshToken: string;
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

function generateTokens(login: string): ITokens {
  const payload = { login };
  const refreshKey = process.env.REFRESH_KEY;
  const accessKey = process.env.ACCESS_KEY;

  if (!refreshKey || !accessKey) throw new Error("MISSING KEYS");

  const accessToken = jwt.sign(payload, accessKey, { expiresIn: "60s" });
  const refreshToken = jwt.sign(payload, refreshKey, { expiresIn: "7 days" });

  return { accessToken, refreshToken };
}

function verifyToken(type: "access" | "refresh", token: string) {
  const key =
    type === "access" ? process.env.ACCESS_KEY : process.env.REFRESH_KEY;

  if (!key) throw new Error("MISSING KEYS");

  jwt.verify(token, key, (err) => {
    if (err) throw new Error("Invalid Token:" + err);
  });
  const decodedToken = jwt.decode(token) as JwtPayload;

  return decodedToken.login;
}

function validateUserPassword(user: IUser, password: string) {
  const hashedPassword = createHash(password, user.salt);
  if (hashedPassword !== user.password) throw new Error("ACCESS DENIED");
}

function getUserByLogin(login: string) {
  const db = getDB();
  const userIndex = db.users.findIndex(
    (userInTest) => userInTest.login === login
  );

  if (userIndex === -1) throw new Error(notFoundError);

  return { user: db.users[userIndex], index: userIndex };
}

function getTokens(credentials: { login: string; password: string } | string) {
  if (typeof credentials === "string") {
    const login = verifyToken("refresh", credentials);

    getUserByLogin(login);

    return generateTokens(login);
  }

  const { user } = getUserByLogin(credentials.login);

  validateUserPassword(user, credentials.password);

  return generateTokens(credentials.login);
}

function createUser(login: string, password: string): ITokens {
  verifyString(login, 3);
  verifyString(password, 8);

  try {
    getUserByLogin(login);
  } catch (err) {
    const db = getDB();

    const salt = generateSalt();
    const hashedPassword = createHash(password, salt);
    const newUser: IUser = {
      login,
      password: hashedPassword,
      salt,
    };

    db.users.push(newUser);
    updateDB(db);

    return generateTokens(login);
  }
  throw new Error("this login is already in use");
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

function createToDo(content: string, accessToken: string): IToDo {
  verifyString(content);
  const userLogin = verifyToken("access", accessToken);

  const toDo: IToDo = {
    userLogin,
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

function readAllToDos(accessToken: string): IToDo[] {
  const userLogin = verifyToken("access", accessToken);

  const db = getDB();
  const toDos = db.toDos.filter(
    (toDoInTest) => toDoInTest.userLogin === userLogin
  );

  return toDos;
}

function findToDoById(id: string, accessToken: string): IToDo | null {
  const userLogin = verifyToken("access", accessToken);

  const db = getDB();

  const toDoSelected = db.toDos.find((toDo: IToDo) => toDo.id === id);
  if (toDoSelected && toDoSelected.userLogin !== userLogin)
    throw new Error("ACCESS DENIED");

  return toDoSelected || null;
}

function updateToDo(
  id: string,
  toDoUpdates: Partial<IToDo>,
  accessToken: string
): IToDo {
  if (toDoUpdates.id || toDoUpdates.createdAt || toDoUpdates.userLogin)
    throw new Error("you can't update the id, userLogin and createdAt field");

  const userLogin = verifyToken("access", accessToken);

  const db = getDB();
  const toDoSelected = db.toDos.findIndex((toDo: IToDo) => toDo.id === id);

  if (toDoSelected === -1) throw new Error(notFoundError);

  const currentToDo = db.toDos[toDoSelected];
  if (currentToDo && currentToDo.userLogin !== userLogin)
    throw new Error("ACCESS DENIED");
  const updatedToDo: IToDo = {
    ...currentToDo,
    ...toDoUpdates,
    updatedAt: new Date().toISOString(),
  };

  db.toDos[toDoSelected] = updatedToDo;
  updateDB(db);

  return updatedToDo;
}

function changeIsDoneById(id: string, accessToken: string): IToDo {
  const userLogin = verifyToken("access", accessToken);

  const db = getDB();
  const toDoIndex = db.toDos.findIndex((toDo: IToDo) => toDo.id === id);

  if (toDoIndex === -1) throw new Error(notFoundError);

  const currentToDo = db.toDos[toDoIndex];
  if (currentToDo && currentToDo.userLogin !== userLogin)
    throw new Error("ACCESS DENIED");
  const updatedToDo: IToDo = {
    ...currentToDo,
    isDone: !currentToDo.isDone,
    updatedAt: new Date().toISOString(),
  };

  db.toDos[toDoIndex] = updatedToDo;
  updateDB(db);

  return updatedToDo;
}

function updateContentById(
  id: string,
  content: string,
  accessToken: string
): IToDo {
  return updateToDo(id, { content }, accessToken);
}

//test
NEW_DB();

const user = createUser("DANIEL", "12345678");

createToDo("TEST 1", user.accessToken);
const toDo = createToDo("TEST 2", user.accessToken);

console.log("READ ALL", readAllToDos(user.accessToken));
updateContentById(toDo.id, "TEST 4", user.accessToken);
console.log("FIND BY ID", findToDoById(toDo.id, user.accessToken));

setTimeout(() => {
  try {
    console.log(createToDo("TEST 3", user.accessToken));
  } catch (error) {
    console.log(error);
    const newTokens = getTokens(user.refreshToken);
    console.log("NEW TOKENS", newTokens);

    createToDo("TEST 3", newTokens.accessToken);
  }
}, 60002);
