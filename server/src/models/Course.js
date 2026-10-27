const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema(
  {
    courseCode: {
      type: String,
      required: [true, 'courseCode is required'],
      trim: true,
      uppercase: true,
      unique: true
    },
    title: {
      type: String,
      required: [true, 'title is required'],
      trim: true
    },
    facultyName: {
      type: String,
      required: [true, 'facultyName is required'],
      trim: true
    },
    credits: {
      type: Number,
      min: [0, 'credits cannot be negative'],
      default: 0
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Unique courseCode is indexed via field definition
const Course = mongoose.models.Course || mongoose.model('Course', courseSchema);

module.exports = Course;
