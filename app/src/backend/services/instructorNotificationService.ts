import { Database } from "../../database/config.ts";
import { AllocationModel } from "../../database/models/allocation.ts";
import { CourseModel } from "../../database/models/course.ts";
import { SystemSettingsModel } from "../../database/models/systemSettings.ts";
import { TANeedModel } from "../../database/models/taNeed.ts";
import { UserModel } from "../../database/models/user.ts";
import { NotificationService } from "./notification.ts";

export interface InstructorNotificationData {
  instructorId: number;
  courseId?: number;
  allocationId?: number;
  taRequestId?: number;
  deadlineType?: string;
  deadlineDate?: Date;
  metadata?: any;
}

export class InstructorNotificationService {
  private db: Database;
  private notificationService: NotificationService;
  private systemSettingsModel: SystemSettingsModel;
  private userModel: UserModel;
  private courseModel: CourseModel;
  private taNeedModel: TANeedModel;
  private allocationModel: AllocationModel;

  constructor(database: Database) {
    this.db = database;
    this.notificationService = new NotificationService(database);
    this.systemSettingsModel = new SystemSettingsModel(database);
    this.userModel = new UserModel(database);
    this.courseModel = new CourseModel(database);
    this.taNeedModel = new TANeedModel(database);
    this.allocationModel = new AllocationModel(database);
  }

  /**
   * Send deadline reminder to instructor
   */
  async sendDeadlineReminder(data: InstructorNotificationData): Promise<void> {
    const instructor = await this.userModel.getUserById(data.instructorId);
    if (!instructor || instructor.role !== 'instructor') {
      throw new Error('Invalid instructor ID');
    }

    const course = data.courseId ? await this.courseModel.getCourseById(data.courseId) : null;
    const daysUntil = data.deadlineDate ? 
      Math.ceil((data.deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;

    let title: string;
    let message: string;
    let actionUrl = '/instructor/dashboard';

    switch (data.deadlineType) {
      case 'ta_request_deadline':
        title = `TA Request Deadline Reminder - ${daysUntil} Day${daysUntil === 1 ? '' : 's'} Remaining`;
        message = course 
          ? `Don't forget to submit your TA request for ${course.code} - ${course.title}. The deadline is ${data.deadlineDate?.toLocaleDateString()}.`
          : `TA request deadline is approaching in ${daysUntil} day${daysUntil === 1 ? '' : 's'} (${data.deadlineDate?.toLocaleDateString()}). Please submit your requests soon.`;
        actionUrl = course ? `/instructor/courses/${course.course_id}` : '/instructor/ta-requests';
        break;
      
      case 'allocation_review_deadline':
        title = `TA Allocation Review Deadline - ${daysUntil} Day${daysUntil === 1 ? '' : 's'} Remaining`;
        message = course
          ? `Please review the proposed TA allocations for ${course.code} - ${course.title}. Deadline: ${data.deadlineDate?.toLocaleDateString()}.`
          : `TA allocation review deadline is in ${daysUntil} day${daysUntil === 1 ? '' : 's'}. Please review all pending allocations.`;
        actionUrl = '/instructor/allocations';
        break;

      case 'final_allocation_submission':
        title = `Final Day: TA Request Submission Deadline`;
        message = `Today is the final day to submit TA requests. The deadline is midnight tonight (${data.deadlineDate?.toLocaleDateString()}).`;
        actionUrl = '/instructor/ta-requests';
        break;

      default:
        title = `Important Deadline Reminder`;
        message = `You have an upcoming deadline in ${daysUntil} day${daysUntil === 1 ? '' : 's'}: ${data.deadlineType}`;
    }

    await this.notificationService.sendNotification({
      userId: data.instructorId,
      type: 'deadline_reminder',
      title,
      message,
      courseId: data.courseId,
      actionUrl,
      actionText: 'View Details',
      metadata: {
        deadline_type: data.deadlineType,
        days_until: daysUntil,
        course_code: course?.code,
        ...data.metadata
      }
    });
  }

  /**
   * Notify instructor about final TA allocation confirmation
   */
  async notifyAllocationConfirmation(data: InstructorNotificationData): Promise<void> {
    const instructor = await this.userModel.getUserById(data.instructorId);
    if (!instructor || instructor.role !== 'instructor') {
      throw new Error('Invalid instructor ID');
    }

    const course = data.courseId ? await this.courseModel.getCourseById(data.courseId) : null;
    if (!course) {
      throw new Error('Course not found');
    }

    // Get allocation details
    const labSections = await this.db.query(`
      SELECT 
        ls.section_name,
        ls.lab_days,
        ls.lab_start_time,
        ls.lab_end_time,
        u.name as ta_name,
        u.email as ta_email
      FROM lab_sections ls
      LEFT JOIN ta_allocations alloc ON ls.lab_section_id = alloc.lab_section_id AND alloc.status = 'active'
      LEFT JOIN users u ON alloc.user_id = u.user_id
      WHERE ls.course_id = $1
      ORDER BY ls.section_name
    `, [course.course_id]);

    const allocatedSections = labSections.rows.filter((section: any) => section.ta_name);
    const unallocatedSections = labSections.rows.filter((section: any) => !section.ta_name);

    let message = `TA allocations for ${course.code} - ${course.title} have been finalized.\n\n`;
    
    if (allocatedSections.length > 0) {
      message += `Assigned TAs:\n`;
      allocatedSections.forEach((section: any) => {
        const schedule = `${section.lab_days}, ${section.lab_start_time}-${section.lab_end_time}`;
        message += `• ${section.section_name} (${schedule}): ${section.ta_name} (${section.ta_email})\n`;
      });
    }

    if (unallocatedSections.length > 0) {
      message += `\nSections without TAs:\n`;
      unallocatedSections.forEach((section: any) => {
        const schedule = `${section.lab_days}, ${section.lab_start_time}-${section.lab_end_time}`;
        message += `• ${section.section_name} (${schedule})\n`;
      });
    }

    message += `\nPlease contact your assigned TAs to coordinate the semester schedule.`;

    await this.notificationService.sendNotification({
      userId: data.instructorId,
      type: 'allocation_confirmed',
      title: `TA Allocations Finalized - ${course.code}`,
      message,
      courseId: data.courseId,
      actionUrl: `/instructor/courses/${course.course_id}`,
      actionText: 'View Course Details',
      metadata: {
        allocation_type: 'final_confirmation',
        course_code: course.code,
        allocated_count: allocatedSections.length,
        unallocated_count: unallocatedSections.length,
        ...data.metadata
      }
    });
  }

  /**
   * Notify instructor when a TA request is approved/rejected
   */
  async notifyTARequestUpdate(data: InstructorNotificationData): Promise<void> {
    const instructor = await this.userModel.getUserById(data.instructorId);
    if (!instructor || instructor.role !== 'instructor') {
      throw new Error('Invalid instructor ID');
    }

    const taRequest = data.taRequestId ? await this.taNeedModel.getNeedById(data.taRequestId) : null;
    const course = data.courseId ? await this.courseModel.getCourseById(data.courseId) : null;

    if (!taRequest || !course) {
      throw new Error('TA request or course not found');
    }

    let title: string;
    let message: string;
    let notificationType: 'application_accepted' | 'application_rejected' | 'deadline_reminder' = 'application_accepted';

    switch (taRequest.status) {
      case 'open':
        title = `TA Request Approved - ${course.code}`;
        message = `Your TA request for ${course.code} - ${course.title} has been approved. You can now expect ${taRequest.hours_required} TA${taRequest.hours_required === 1 ? '' : 's'} to be allocated to your course.`;
        notificationType = 'application_accepted';
        break;
      
      case 'cancelled':
        title = `TA Request Status Update - ${course.code}`;
        message = `Your TA request for ${course.code} - ${course.title} has been cancelled. Please contact the TA coordinator if you believe this is an error.`;
        notificationType = 'application_rejected';
        break;
      
      case 'filled':
        title = `TA Request Fulfilled - ${course.code}`;
        message = `Your TA request for ${course.code} - ${course.title} has been fulfilled. TA allocations are now being processed.`;
        notificationType = 'application_accepted';
        break;

      default:
        title = `TA Request Update - ${course.code}`;
        message = `Your TA request for ${course.code} - ${course.title} has been updated to status: ${taRequest.status}`;
    }

    await this.notificationService.sendNotification({
      userId: data.instructorId,
      type: notificationType,
      title,
      message,
      courseId: data.courseId,
      actionUrl: `/instructor/courses/${course.course_id}`,
      actionText: 'View Course',
      metadata: {
        ta_request_id: data.taRequestId,
        course_code: course.code,
        status: taRequest.status,
        num_required: taRequest.hours_required,
        ...data.metadata
      }
    });
  }

  /**
   * Notify instructor when they submit a TA request
   */
  async notifyTARequestSubmission(data: InstructorNotificationData): Promise<void> {
    const instructor = await this.userModel.getUserById(data.instructorId);
    if (!instructor || instructor.role !== 'instructor') {
      throw new Error('Invalid instructor ID');
    }

    const course = data.courseId ? await this.courseModel.getCourseById(data.courseId) : null;
    if (!course) {
      throw new Error('Course not found');
    }

    const taRequest = data.taRequestId ? await this.taNeedModel.getNeedById(data.taRequestId) : null;
    
    const title = `TA Request Submitted - ${course.code}`;
    const message = `Your TA request for ${course.code} - ${course.title} has been submitted successfully. ` +
      `Requested hours: ${taRequest?.hours_required || 'N/A'}. ` +
      `Your request is now pending review by the TA coordinator.`;

    await this.notificationService.sendNotification({
      userId: data.instructorId,
      type: 'ta_request_update',
      title,
      message,
      courseId: data.courseId,
      actionUrl: `/instructor/courses/${course.course_id}`,
      actionText: 'View Course',
      metadata: {
        ta_request_id: data.taRequestId,
        course_code: course.code,
        hours_requested: taRequest?.hours_required,
        submission_type: 'new_request',
        ...data.metadata
      }
    });
  }

  /**
   * Notify instructor when TA coordinator approves/rejects their TA request
   */
  async notifyTARequestStatusChange(data: InstructorNotificationData): Promise<void> {
    const instructor = await this.userModel.getUserById(data.instructorId);
    if (!instructor || instructor.role !== 'instructor') {
      throw new Error('Invalid instructor ID');
    }

    const taRequest = data.taRequestId ? await this.taNeedModel.getNeedById(data.taRequestId) : null;
    const course = data.courseId ? await this.courseModel.getCourseById(data.courseId) : null;

    if (!taRequest || !course) {
      throw new Error('TA request or course not found');
    }

    let title: string;
    let message: string;
    let notificationType: 'ta_request_update' = 'ta_request_update';

    switch (taRequest.status) {
      case 'open':
        title = `TA Request Approved - ${course.code}`;
        message = `Great news! Your TA request for ${course.code} - ${course.title} has been approved by the TA coordinator. ` +
          `Requested hours: ${taRequest.hours_required}. The TA allocation process will begin soon.`;
        break;
      
      case 'cancelled':
        title = `TA Request Declined - ${course.code}`;
        message = `Your TA request for ${course.code} - ${course.title} has been declined by the TA coordinator. ` +
          `Please contact the TA coordinator if you have questions or believe this is an error.`;
        break;
      
      case 'filled':
        title = `TA Request Fulfilled - ${course.code}`;
        message = `Your TA request for ${course.code} - ${course.title} has been fulfilled! ` +
          `The TA coordinator is now processing allocations. You'll receive another notification once TAs are assigned.`;
        break;

      default:
        title = `TA Request Status Update - ${course.code}`;
        message = `Your TA request for ${course.code} - ${course.title} status has been updated to: ${taRequest.status}.`;
    }

    await this.notificationService.sendNotification({
      userId: data.instructorId,
      type: notificationType,
      title,
      message,
      courseId: data.courseId,
      actionUrl: `/instructor/courses/${course.course_id}`,
      actionText: 'View Course',
      metadata: {
        ta_request_id: data.taRequestId,
        course_code: course.code,
        status: taRequest.status,
        hours_requested: taRequest.hours_required,
        status_change: true,
        ...data.metadata
      }
    });
  }

  /**
   * Send bulk notifications to all instructors about system-wide deadlines
   */
  /*
  async sendBulkDeadlineNotification(deadlineType: string, deadlineDate: Date, customMessage?: string): Promise<number> {
    const instructors = await this.userModel.getUsersByRole('instructor');
    let notificationsSent = 0;

    for (const instructor of instructors) {
      try {
        // Check if instructor has any active courses
        const courses = await this.courseModel.getCoursesByInstructor(instructor.user_id!);
        
        if (courses.length > 0) {
          await this.sendDeadlineReminder({
            instructorId: instructor.user_id!,
            deadlineType,
            deadlineDate,
            metadata: {
              bulk_notification: true,
              custom_message: customMessage,
              instructor_courses: courses.length
            }
          });
          notificationsSent++;
        }
      } catch (error) {
        console.error(`Failed to send notification to instructor ${instructor.email}:`, error);
      }
    }

    return notificationsSent;
  }
  */
 async sendBulkDeadlineNotification(deadlineType: string, deadlineDate: Date, customMessage?: string): Promise<number> {
  const instructors = await this.userModel.getUsersByRole('instructor');
  let notificationsSent = 0;

  console.log(`🔍 Found ${instructors.length} instructors`); // DEBUG

  for (const instructor of instructors) {
    try {
      console.log(`🔍 Checking courses for instructor ${instructor.user_id} (${instructor.email})`); // DEBUG
      
      const courses = await this.courseModel.getCoursesByInstructor(instructor.user_id!);
      
      console.log(`🔍 Found ${courses.length} courses for instructor ${instructor.user_id}`); // DEBUG
      console.log(`🔍 Courses:`, courses.map(c => `${c.code} (instructor_id: ${c.instructor_id})`)); // DEBUG
      
      if (courses.length > 0) {
        await this.sendDeadlineReminder({
          instructorId: instructor.user_id!,
          deadlineType,
          deadlineDate,
          metadata: {
            bulk_notification: true,
            custom_message: customMessage,
            instructor_courses: courses.length
          }
        });
        notificationsSent++;
        console.log(`✅ Sent notification to instructor ${instructor.user_id}`); // DEBUG
      } else {
        console.log(`❌ No courses found for instructor ${instructor.user_id}`); // DEBUG
      }
    } catch (error) {
      console.error(`Failed to send notification to instructor ${instructor.email}:`, error);
    }
  }

  console.log(`🔍 Total notifications sent: ${notificationsSent}`); // DEBUG
  return notificationsSent;
}
  /**
   * Automatically check and send deadline reminders based on system settings
   */
  async processAutomaticDeadlineReminders(): Promise<void> {
    try {
      // Get instructor request deadline setting
      const instructorDeadlineSetting = await this.systemSettingsModel.getSettingByKey('instructor_request_deadline');
      
      if (!instructorDeadlineSetting) {
        console.log('No instructor request deadline configured');
        return;
      }

      const deadlineDate = new Date(instructorDeadlineSetting.value);
      const now = new Date();
      const daysUntilDeadline = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Send reminders at 7 days, 3 days, 1 day, and final day
      const reminderDays = [7, 3, 1];
      
      if (reminderDays.includes(daysUntilDeadline) && daysUntilDeadline > 0) {
        console.log(`Sending ${daysUntilDeadline}-day deadline reminders to instructors`);
        
        const sent = await this.sendBulkDeadlineNotification(
          'ta_request_deadline',
          deadlineDate,
          `Reminder: TA request deadline is in ${daysUntilDeadline} day${daysUntilDeadline === 1 ? '' : 's'}`
        );
        
        console.log(`Sent deadline reminders to ${sent} instructors`);
      } else if (daysUntilDeadline === 0) {
        // Final day notification
        console.log('Sending final day deadline notifications to instructors');
        
        const sent = await this.sendBulkDeadlineNotification(
          'final_allocation_submission',
          deadlineDate,
          'FINAL NOTICE: TA request deadline is TODAY!'
        );
        
        console.log(`Sent final deadline notices to ${sent} instructors`);
      }

    } catch (error) {
      console.error('Error processing automatic deadline reminders:', error);
    }
  }

  /**
   * Send notification when new TA applications are received for instructor's course
   */
  async notifyNewApplicationsReceived(instructorId: number, courseId: number, applicationCount: number): Promise<void> {
    const instructor = await this.userModel.getUserById(instructorId);
    const course = await this.courseModel.getCourseById(courseId);

    if (!instructor || !course) {
      throw new Error('Instructor or course not found');
    }

    await this.notificationService.sendNotification({
      userId: instructorId,
      type: 'application_submitted',
      title: `New TA Applications Received - ${course.code}`,
      message: `${applicationCount} new TA application${applicationCount === 1 ? '' : 's'} received for ${course.code} - ${course.title}. You can review the applications and provide feedback to help with the selection process.`,
      courseId,
      actionUrl: `/instructor/courses/${courseId}/applications`,
      actionText: 'Review Applications',
      metadata: {
        application_count: applicationCount,
        course_code: course.code
      }
    });
  }

  /**
   * Get instructor notification history with filtering
   */
  async getInstructorNotificationHistory(
    instructorId: number, 
    limit: number = 50, 
    offset: number = 0,
    filters?: {
      type?: string;
      courseId?: number;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<{
    notifications: any[];
    total: number;
    unreadCount: number;
  }> {
    const instructor = await this.userModel.getUserById(instructorId);
    if (!instructor || instructor.role !== 'instructor') {
      throw new Error('Invalid instructor ID');
    }

    // Build query with filters
    let whereConditions = ['n.user_id = $1'];
    let queryParams: any[] = [instructorId];
    let paramIndex = 2;

    if (filters?.type) {
      whereConditions.push(`n.type = $${paramIndex}`);
      queryParams.push(filters.type);
      paramIndex++;
    }

    if (filters?.courseId) {
      whereConditions.push(`n.related_course_id = $${paramIndex}`);
      queryParams.push(filters.courseId);
      paramIndex++;
    }

    if (filters?.startDate) {
      whereConditions.push(`n.created_at >= $${paramIndex}`);
      queryParams.push(filters.startDate);
      paramIndex++;
    }

    if (filters?.endDate) {
      whereConditions.push(`n.created_at <= $${paramIndex}`);
      queryParams.push(filters.endDate);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM notifications n
      WHERE ${whereClause}
    `;
    const countResult = await this.db.query(countQuery, queryParams);
    const total = parseInt(String(countResult.rows[0].total));

    // Get unread count
    const unreadCountQuery = `
      SELECT COUNT(*) as unread_count
      FROM notifications n
      WHERE ${whereClause} AND n.read_at IS NULL
    `;
    const unreadResult = await this.db.query(unreadCountQuery, queryParams);
    const unreadCount = parseInt(String(unreadResult.rows[0].unread_count));

    // Get notifications with course info
    const notificationsQuery = `
      SELECT 
        n.*,
        c.code as course_code,
        c.title as course_title
      FROM notifications n
      LEFT JOIN courses c ON n.related_course_id = c.course_id
      WHERE ${whereClause}
      ORDER BY n.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(limit, offset);

    const notificationsResult = await this.db.query(notificationsQuery, queryParams);

    return {
      notifications: notificationsResult.rows,
      total,
      unreadCount
    };
  }
}
