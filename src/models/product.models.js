import mongoose, { Schema } from "mongoose";


const productSchema = new Schema(
    {
        product_image: {
            type: String,
            required: true
        },
        product_title: {
            type: String,
            required: true
        },
        product_category: {
            type: String,
            required: true
        },
        product_type: {
            type: String,
            required: true
        },
        amount: {
            type: Number,
            required: true
        },
        status: {
            type: String,
            enum: ['sold', 'live'],
            required: true
        }
    },
    {
        timestamps: true
    }
)


export const Product = mongoose.model("Product", productSchema);