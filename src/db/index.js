import mongoose from "mongoose";
import { DB_NAME } from "../constants.js"; // Ensure this imports the correct database name

const connectDB = async () => {
    try {
        const mongoURI = `${process.env.MONGODB_URI}/${DB_NAME}`;
        const mongoconnection = await mongoose.connect(mongoURI);
        console.log(`\nMongoDB Connected: ${mongoconnection.connection.host}`);
        console.log(`url ${mongoURI}`);
    } catch (error) {
        console.error("MONGODB Connection error", error);
        process.exit(1); // Exit process with failure
    }
};

export default connectDB;
