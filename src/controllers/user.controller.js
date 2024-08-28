import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
import nodemailer from 'nodemailer';



// generate access and refresh token
const generateAccessAndRefereshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }


    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating referesh and access token")
    }
}

// Register user
const registerUser = asyncHandler(async (req, res) => {
    const { name, surname, email, password, phone_number, age, gender, address, state, district, subdistrict, pin_code } = req.body;

    // check details are present or not
    if (
        [name, surname, email, password, phone_number, age, gender, address, state, district, subdistrict, pin_code].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    // check if the user exist or not
    const existedUser = await User.findOne({ email });

    if (existedUser) {
        throw new ApiError(409, "User is already registered")
    }

    // take avatar image and check wheather there is any avatar image or not
    const avatarLocalPath = req.files?.avatar[0]?.path;
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }

    // after uploading the avatar image check weather the link is present or not
    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }

    const user = await User.create({
        avatar: avatar.url,
        name,
        surname,
        email,
        password,
        phone_number,
        age,
        gender,
        address,
        state,
        district,
        subdistrict,
        pin_code
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )

})


const loginUser = asyncHandler(async (req, res) => {
    const { email, phone_number, password } = req.body;

    if (!(email || phone_number)) {
        throw new ApiError(400, "Username or phone number is required");
    }

    const user = await User.findOne({
        $or: [{ email }, { phone_number }]
    });

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    // Now you can use the isPasswordCorrect method
    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    const options = {
        httpOnly: true,
        secure: false, // Set this to true in production if you're using HTTPS
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser,
                    accessToken,
                    refreshToken,
                },
                "User logged in successfully"
            )
        );
});


const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1 // this removes the field from document
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: false
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged Out"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )

        const user = await User.findById(decodedToken?._id)

        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")

        }

        const options = {
            httpOnly: true,
            secure: false
        }

        const { accessToken, newRefreshToken } = await generateAccessAndRefereshTokens(user._id)

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken: newRefreshToken },
                    "Access token refreshed"
                )
            )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }

})

function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Email sending function
const emailSender = asyncHandler(async (req, res) => {
    const { email } = req.body;

    // Generate OTP
    const otp = generateOTP();

    // Create a transporter using Gmail's SMTP
    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'starkinanshul@gmail.com', // replace with your email
            pass: 'jtfh zhga mrnd hmid' // replace with your email password or app-specific password
        }
    });

    // Email content
    const mailOptions = {
        from: '"Shetmall"',
        to: email,
        subject: 'Your OTP Code',
        html: `
            <div style="max-width: 600px; margin: auto; padding: 20px; font-family: Arial, sans-serif; color: #333; background-color: #f9f9f9; border-radius: 8px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);">
                <div style="text-align: start;">
                    <img src="http://res.cloudinary.com/dxaw17f4u/image/upload/v1724823023/jnkcz3mhzi09kszlxul5.png" alt="Your Company Logo" style="max-width: 150px; margin-bottom: 20px;">
                </div>
                <div style="background-color: #fff; padding: 30px; border-radius: 8px;">
                    <h2 style="color: #204E51; font-size: 24px; margin-bottom: 20px;">Your Verification Code</h2>
                    <p style="font-size: 16px; line-height: 1.5; color: #555;">Dear User,</p>
                    <p style="font-size: 16px; line-height: 1.5; color: #555;">To complete your verification process, please use the following OTP code:</p>
                    <div style="font-size: 36px; font-weight: bold; color: #204E51; margin: 20px 0;">${otp}</div>
                    <p style="font-size: 16px; line-height: 1.5; color: #555;">This OTP is valid for the next 10 minutes. Please do not share this code with anyone.</p>
                    <p style="font-size: 16px; line-height: 1.5; color: #555;">If you did not request this code, please ignore this email.</p>
                    <a href="https://your-website-url.com" style="display: inline-block; margin-top: 20px; padding: 10px 20px; font-size: 16px; color: #fff; background-color: #204E51; border-radius: 5px; text-decoration: none;">Visit Our Website</a>
                </div>
                <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #999;">
                    <p>&copy; ${new Date().getFullYear()} Your Company Name. All rights reserved.</p>
                    <p>123 Your Street, Your City, Your Country</p>
                </div>
            </div>
        `
    };

    // Send the email
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return res.status(500).json({ error: 'Error sending email: ' + error.message });
        }
        res.status(200).json({ message: 'OTP sent to ' + email });
    });
});

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    emailSender
}