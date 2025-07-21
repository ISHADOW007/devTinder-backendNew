const cloudinary = require('cloudinary').v2;
const fs = require('fs');



cloudinary.config({ 
    cloud_name: process.env.CLOUD_NAME, 
    api_key: process.env.CLOUD_API_KEY, 
    api_secret: process.env.CLOUD_API_SECRET // Click 'View API Keys' above to copy your API secret
});


const uploadOnCloudinary = async (localFilePath, owner) => {
    try {
        if (!localFilePath) return null;

        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
            folder: owner,
            // access_mode: "authenticated",
        });

        console.log("File uploaded to Cloudinary:", response.public_id);

        // Optional: Delete local file after successful upload
        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }

        return response;
    } catch (error) {
        console.error("Cloudinary upload failed:", error);

        // Remove local file if upload fails
        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }

        return null;
    }
};


const deleteVideoFromCloudinary = async (publicId) => {
    try {
      const result = await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
      console.log('Deleted Successfully:', result);
      return result;
    } catch (error) {
      console.error('Error deleting video:', error);
      throw error;
    }
  };

module.exports = {
  uploadOnCloudinary,
  deleteVideoFromCloudinary,
};
