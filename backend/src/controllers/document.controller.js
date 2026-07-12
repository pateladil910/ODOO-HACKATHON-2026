const fs = require('fs');
const path = require('path');
const DocumentModel = require('../models/document.model');
const VehicleModel = require('../models/vehicle.model');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

// Root uploads folder configuration
const UPLOAD_DIR = path.join(__dirname, '../../uploads/documents');

/**
 * Ensures that the target upload folder path exists
 */
const ensureUploadDirExists = () => {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
};

/**
 * Handle document base64 upload and database reference logging
 */
const uploadDocument = asyncHandler(async (req, res) => {
  const { id: vehicle_id } = req.params;
  const { document_name, file_content } = req.body;

  if (!document_name || !file_content) {
    throw new ApiError(400, 'document_name and file_content are required fields.');
  }

  // 1. Verify target vehicle exists
  const vehicle = await VehicleModel.findById(vehicle_id);
  if (!vehicle) {
    throw new ApiError(404, `Vehicle with ID ${vehicle_id} not found.`);
  }

  // 2. Parse Base64 payload
  // Expected format: "data:application/pdf;base64,JVBER..."
  const matches = file_content.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
  if (!matches) {
    throw new ApiError(400, 'Invalid file_content format. Must be a valid Base64 data URI.');
  }

  const fileType = matches[1]; // e.g. "application/pdf"
  const base64Data = matches[2];
  const fileBuffer = Buffer.from(base64Data, 'base64');

  // Extract file extension mapping
  let ext = 'bin';
  if (fileType.includes('pdf')) ext = 'pdf';
  else if (fileType.includes('png')) ext = 'png';
  else if (fileType.includes('jpeg') || fileType.includes('jpg')) ext = 'jpg';
  else if (fileType.includes('text') || fileType.includes('plain')) ext = 'txt';
  else if (fileType.includes('msword') || fileType.includes('document')) ext = 'doc';

  const fileName = `v_${vehicle_id}_${Date.now()}.${ext}`;
  const absolutePath = path.join(UPLOAD_DIR, fileName);

  try {
    ensureUploadDirExists();
    
    // 3. Write file to disk
    fs.writeFileSync(absolutePath, fileBuffer);

    // 4. Save metadata reference to DB
    const newDoc = await DocumentModel.create({
      vehicle_id,
      document_name,
      file_path: `/uploads/documents/${fileName}`,
      file_type: fileType
    });

    res.status(201).json(new ApiResponse(201, newDoc, 'Vehicle document uploaded successfully.'));
  } catch (error) {
    console.error('[Upload Document Error]', error);
    throw new ApiError(500, `Failed to save document files: ${error.message}`);
  }
});

/**
 * Retrieve list of all documents registered for a specific vehicle
 */
const getVehicleDocuments = asyncHandler(async (req, res) => {
  const { id: vehicle_id } = req.params;

  // Verify vehicle exists
  const vehicle = await VehicleModel.findById(vehicle_id);
  if (!vehicle) {
    throw new ApiError(404, `Vehicle with ID ${vehicle_id} not found.`);
  }

  const documents = await DocumentModel.findByVehicleId(vehicle_id);
  res.status(200).json(new ApiResponse(200, documents, 'Vehicle documents retrieved successfully.'));
});

/**
 * Handle document file download request
 */
const downloadDocument = asyncHandler(async (req, res) => {
  const { docId } = req.params;

  // 1. Fetch document metadata
  const doc = await DocumentModel.findById(docId);
  if (!doc) {
    throw new ApiError(404, `Document with ID ${docId} not found.`);
  }

  // Resolving storage filepath
  const fileName = path.basename(doc.file_path);
  const absolutePath = path.join(UPLOAD_DIR, fileName);

  // 2. Validate file existence on disk
  if (!fs.existsSync(absolutePath)) {
    throw new ApiError(410, 'Document file has been removed or is unavailable on this host server.');
  }

  // 3. Transmit file attachment
  res.setHeader('Content-Type', doc.file_type || 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${doc.document_name}"`);
  
  const fileStream = fs.createReadStream(absolutePath);
  fileStream.pipe(res);
});

/**
 * Handle document deletion
 */
const deleteDocument = asyncHandler(async (req, res) => {
  const { docId } = req.params;

  // 1. Fetch document metadata
  const doc = await DocumentModel.findById(docId);
  if (!doc) {
    throw new ApiError(404, `Document with ID ${docId} not found.`);
  }

  // 2. Remove file from file system
  const fileName = path.basename(doc.file_path);
  const absolutePath = path.join(UPLOAD_DIR, fileName);
  if (fs.existsSync(absolutePath)) {
    try {
      fs.unlinkSync(absolutePath);
    } catch (e) {
      console.warn(`[Document deletion warning] Failed to remove local file ${absolutePath}:`, e.message);
    }
  }

  // 3. Remove metadata registry
  await DocumentModel.delete(docId);

  res.status(200).json(new ApiResponse(200, null, 'Vehicle document deleted successfully.'));
});

module.exports = {
  uploadDocument,
  getVehicleDocuments,
  downloadDocument,
  deleteDocument
};
