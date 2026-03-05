// ===============================
// FILE: database.js
// ===============================
import mongoose from "mongoose";

export { mongoose };

const connectDB = async () => {
  const connect = async () => {
    try {
      await mongoose.connect(process.env.MONGO_URI, { autoIndex: true });
      console.log("🟢 MongoDB connected");
    } catch (err) {
      console.log("🔴 Mongo retry in 5s", err.message);
      setTimeout(connect, 5000);
    }
  };
  mongoose.connection.on("disconnected", connect);
  connect();
};

export default connectDB;
