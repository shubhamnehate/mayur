import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, Users, BookOpen, ArrowLeft, CreditCard, Building2, Mail } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Course, fetchCourseAccess, fetchCourseBySlug } from "@/api/courses";
import { createEnrollment } from "@/api/enrollments";
import { createPaymentOrder, verifyPayment } from "@/api/payments";

interface RazorpayHandlerResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayFailureResponse {
  error?: {
    description?: string;
  };
}

type RazorpayCheckout = {
  open: () => void;
  on: (event: string, handler: (response: RazorpayFailureResponse) => void) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayCheckout;
  }
}

interface StaticCourseInfo {
  title: string;
  subtitle?: string;
  description: string;
  priceEUR: string;
  priceINR: string;
  instructor: string;
  duration: string;
  level: string;
  learningOutcomes: string[];
  projects: string[];
  topics: string[];
  guestLecture?: {
    speaker: string;
    title: string;
    description: string;
  };
}

const coursesData: Record<string, StaticCourseInfo> = {
  "ai-bootcamp": {
    title: "AI Bootcamp",
    subtitle: "ML → LLMs → Generative AI",
    description: "Learn machine learning, deep learning, reinforcement learning, and generative AI for robotics and autonomous systems. Includes 5 recruiter-ready projects and portfolio deliverables.",
    priceEUR: "€150",
    priceINR: "₹15,000",
    instructor: "Mayur Waghchoure",
    duration: "12 weeks",
    level: "Intermediate",
    learningOutcomes: [
      "Master machine learning fundamentals and algorithms",
      "Build deep learning models for computer vision and NLP",
      "Implement reinforcement learning for robotics control",
      "Create generative AI applications using LLMs",
      "Develop 5 portfolio-ready projects",
      "Learn industry best practices for ML deployment"
    ],
    projects: [
      "Image Classification with CNNs",
      "Natural Language Processing with Transformers",
      "Reinforcement Learning for Robot Navigation",
      "Generative AI Content Creation",
      "End-to-End ML Pipeline Deployment"
    ],
    topics: [
      "Machine Learning Fundamentals",
      "Deep Learning & Neural Networks",
      "Computer Vision with CNNs",
      "Natural Language Processing",
      "Reinforcement Learning",
      "Large Language Models (LLMs)",
      "Generative AI & Transformers",
      "ML Operations & Deployment"
    ]
  },
  "adas-bootcamp": {
    title: "ADAS & Autonomous Driving Bootcamp",
    subtitle: "",
    description: "Learn system design, safety (ISO 26262/SOTIF), simulation, and validation for advanced driver assistance systems. Includes lane keeping, fusion, and real-world testing workflows.",
    priceEUR: "€249",
    priceINR: "₹24,999",
    instructor: "Mayur Waghchoure",
    duration: "16 weeks",
    level: "Advanced",
    learningOutcomes: [
      "Design complete ADAS systems from scratch",
      "Master ISO 26262 and SOTIF safety standards",
      "Implement sensor fusion algorithms",
      "Build lane keeping and adaptive cruise control",
      "Create simulation and validation pipelines",
      "Understand real-world testing procedures"
    ],
    projects: [
      "Lane Keeping Assist System",
      "Adaptive Cruise Control (ACC)",
      "Sensor Fusion Pipeline",
      "Simulation Environment Setup",
      "Safety Validation Framework"
    ],
    topics: [
      "ADAS System Architecture",
      "ISO 26262 Functional Safety",
      "SOTIF Safety Framework",
      "Sensor Fusion (Camera, Radar, Lidar)",
      "Lane Detection & Tracking",
      "Adaptive Cruise Control",
      "Simulation Tools (CARLA, MATLAB)",
      "Validation & Testing Workflows"
    ]
  },
  "controls-bootcamp": {
    title: "Modern Vehicle Control Bootcamp",
    subtitle: "PID → LQR → MPC",
    description: "Master modern vehicle control techniques for autonomous driving. Learn Linear, Stochastic, and Optimal Control and apply them in real projects like ACC, ESC, and MPC-based trajectory tracking.",
    priceEUR: "€99",
    priceINR: "₹9,999",
    instructor: "Mayur Waghchoure",
    duration: "10 weeks",
    level: "Intermediate",
    learningOutcomes: [
      "Understand classical and modern control theory",
      "Implement PID controllers for vehicle systems",
      "Master Linear Quadratic Regulator (LQR)",
      "Design Model Predictive Controllers (MPC)",
      "Apply controls to autonomous driving scenarios",
      "Build trajectory tracking systems"
    ],
    projects: [
      "PID-based Speed Control",
      "LQR for Lateral Control",
      "MPC Trajectory Tracking",
      "Adaptive Cruise Control",
      "Electronic Stability Control"
    ],
    topics: [
      "Control Systems Fundamentals",
      "PID Controller Design & Tuning",
      "State-Space Representation",
      "Linear Quadratic Regulator (LQR)",
      "Model Predictive Control (MPC)",
      "Vehicle Dynamics Modeling",
      "Trajectory Tracking",
      "Adaptive & Robust Control"
    ]
  },
  "motion-planning-bootcamp": {
    title: "Motion Prediction & Planning Bootcamp",
    subtitle: "Autonomous Driving",
    description: "Learn how self-driving cars forecast future trajectories and plan safe motion using A*, Frenet/Lattice planners, MPC, and risk-aware decision making (MPDM). Includes 3 hands-on projects + free guest lecture.",
    priceEUR: "€99",
    priceINR: "₹9,999",
    instructor: "Adityaveer Raswan",
    duration: "10 weeks",
    level: "Advanced",
    learningOutcomes: [
      "Predict future trajectories of surrounding vehicles",
      "Implement A* and hybrid A* path planning",
      "Design Frenet and Lattice-based planners",
      "Build MPC-based trajectory optimization",
      "Apply risk-aware decision making (MPDM)",
      "Integrate planning with perception systems"
    ],
    projects: [
      "Trajectory Prediction System",
      "A* Path Planner Implementation",
      "Frenet/Lattice Motion Planner",
      "MPC Trajectory Optimizer",
      "Risk-Aware Decision Making System"
    ],
    topics: [
      "Motion Prediction Algorithms",
      "Path Planning (A*, Hybrid A*)",
      "Frenet Frame Planning",
      "Lattice-based Planners",
      "Model Predictive Control for Planning",
      "Multi-Policy Decision Making (MPDM)",
      "Collision Avoidance",
      "Real-time Planning Optimization"
    ],
    guestLecture: {
      speaker: "Darsh Patel",
      title: "ISO 26262 / SOTIF Functional Safety",
      description: "Free guest lecture on automotive functional safety for autonomous systems"
    }
  },
  "cicd-bootcamp": {
    title: "CI/CD for Autonomous Systems",
    subtitle: "Jenkins · Docker · Kubernetes",
    description: "Learn to automate builds, tests, and deployments for AI and Control projects using GitHub, Jenkins, Docker, and Kubernetes. Build a full DevOps pipeline and deploy a live app to Kubernetes.",
    priceEUR: "€49",
    priceINR: "₹4,999",
    instructor: "Mayur Waghchoure",
    duration: "6 weeks",
    level: "Beginner",
    learningOutcomes: [
      "Set up complete CI/CD pipelines",
      "Master Docker containerization",
      "Deploy applications to Kubernetes",
      "Automate testing and quality checks",
      "Implement continuous integration with Jenkins",
      "Build production-ready DevOps workflows"
    ],
    projects: [
      "Dockerize an AI Application",
      "Jenkins CI Pipeline Setup",
      "Kubernetes Deployment",
      "Automated Testing Framework",
      "End-to-End DevOps Pipeline"
    ],
    topics: [
      "Version Control with Git & GitHub",
      "Continuous Integration with Jenkins",
      "Docker Fundamentals & Best Practices",
      "Container Orchestration with Kubernetes",
      "Automated Testing & Quality Gates",
      "Deployment Strategies",
      "Monitoring & Logging",
      "Production DevOps Workflows"
    ]
  },
  "data-science-bootcamp": {
    title: "Data Science Concept Bootcamp",
    subtitle: "",
    description: "Learn the foundations of causal inference, predictive modeling, experimentation, and GenAI data pipelines. Build analytical projects ready for portfolio review.",
    priceEUR: "€50",
    priceINR: "₹5,000",
    instructor: "Mayur Waghchoure",
    duration: "8 weeks",
    level: "Beginner",
    learningOutcomes: [
      "Understand causal inference fundamentals",
      "Build predictive modeling pipelines",
      "Design and analyze experiments",
      "Create GenAI data processing pipelines",
      "Develop analytical thinking skills",
      "Build portfolio-ready projects"
    ],
    projects: [
      "Causal Analysis Project",
      "Predictive Modeling Pipeline",
      "A/B Testing Framework",
      "GenAI Data Pipeline",
      "End-to-End Analytics Solution"
    ],
    topics: [
      "Data Science Fundamentals",
      "Causal Inference Methods",
      "Predictive Modeling Techniques",
      "Experimental Design & A/B Testing",
      "Statistical Analysis",
      "GenAI Data Pipelines",
      "Data Visualization",
      "Analytics Best Practices"
    ]
  }
};

const CourseDetail = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [enrolling, setEnrolling] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const [dbCourse, setDbCourse] = useState<Course | null>(null);
  const course = courseId ? coursesData[courseId] : null;

  const getErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback;

  const loadRazorpayScript = async () => {
    if (window.Razorpay) return true;

    return new Promise<boolean>((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Fetch course metadata from backend
  useEffect(() => {
    const fetchDbCourse = async () => {
      if (!courseId) return;
      try {
        const data = await fetchCourseBySlug(courseId);
        setDbCourse(data);
      } catch (error) {
        setDbCourse(null);
      }
    };
    fetchDbCourse();
  }, [courseId]);

  useEffect(() => {
    const fetchAccess = async () => {
      if (!dbCourse || !user) return;

      try {
        const access = await fetchCourseAccess(dbCourse.id);
        setEnrolled(access.enrolled);
      } catch (error) {
        console.error("Failed to fetch course access", error);
      }
    };

    fetchAccess();
  }, [dbCourse, user]);

  const handleRazorpayCheckout = async () => {
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to enroll in a course.",
        variant: "destructive"
      });
      navigate("/auth");
      return;
    }

    if (!dbCourse) {
      toast({
        title: "Contact for Enrollment",
        description: "Please contact us at cloudbee.robotics@gmail.com to complete your enrollment.",
      });
      return;
    }

    setEnrolling(true);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        throw new Error("Payment provider failed to load. Please try again.");
      }

      const { order, key } = await createPaymentOrder({
        courseId: dbCourse.id,
        userId: user.id,
      });

      if (!order.orderId) {
        throw new Error("Unable to start checkout. Please try again.");
      }

      const checkout = new window.Razorpay({
        key,
        amount: order.amount ? Math.round(order.amount * 100) : undefined,
        currency: order.currency ?? "INR",
        name: course?.title ?? "Course Enrollment",
        description: course?.subtitle ?? course?.description,
        order_id: order.orderId,
        prefill: {
          email: user.email ?? undefined,
          name: user.full_name ?? user.email ?? "Student",
        },
        handler: async (response: RazorpayHandlerResponse) => {
          try {
            await verifyPayment({
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              userId: user.id,
            });
            setEnrolled(true);
            toast({
              title: "Enrollment confirmed",
              description: "Payment verified and course access granted.",
            });
          } catch (error) {
            toast({
              title: "Verification failed",
              description: getErrorMessage(error, "Unable to verify payment"),
              variant: "destructive",
            });
          } finally {
            setEnrolling(false);
          }
        },
        modal: {
          ondismiss: () => setEnrolling(false),
        },
      });

      checkout.on("payment.failed", (response: RazorpayFailureResponse) => {
        toast({
          title: "Payment failed",
          description: response.error?.description ?? "Please try again or use another method.",
          variant: "destructive",
        });
        setEnrolling(false);
      });

      checkout.open();
    } catch (error) {
      toast({
        title: "Enrollment Failed",
        description: getErrorMessage(error, "Enrollment failed"),
        variant: "destructive"
      });
      setEnrolling(false);
    }
  };

  const handleEnroll = async (paymentMethod: 'razorpay' | 'bank_transfer') => {
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to enroll in a course.",
        variant: "destructive"
      });
      navigate("/auth");
      return;
    }

    try {
      if (paymentMethod === 'bank_transfer') {
        setEnrolling(true);
        if (!dbCourse) {
          toast({
            title: "Contact for Enrollment",
            description: "Please contact us at cloudbee.robotics@gmail.com to complete your enrollment.",
          });
          setEnrolling(false);
          return;
        }

        await createEnrollment({
          courseId: dbCourse.id,
          paymentMethod,
          email: user.email ?? undefined,
        });

        toast({
          title: "Enrollment Request Submitted",
          description: "Bank details have been sent to your email. Your access will be activated within 24 hours of payment confirmation.",
        });
        setEnrolling(false);
        return;
      }

      await handleRazorpayCheckout();
    } catch (error) {
      toast({
        title: "Enrollment Failed",
        description: getErrorMessage(error, "Enrollment failed"),
        variant: "destructive"
      });
      if (paymentMethod === 'bank_transfer') {
        setEnrolling(false);
      }
    }
  };

  if (!course) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Course Not Found</h1>
            <Link to="/courses">
              <Button>Back to Courses</Button>
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-12 px-4 gradient-hero">
          <div className="container mx-auto max-w-6xl">
            <Link to="/courses" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-6 transition-colors">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Courses
            </Link>
            
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <Badge className="mb-4">{course.level}</Badge>
                <h1 className="text-4xl md:text-5xl font-bold mb-4">
                  {course.title}
                </h1>
                {course.subtitle && (
                  <p className="text-2xl text-secondary font-semibold mb-4">
                    {course.subtitle}
                  </p>
                )}
                <p className="text-lg text-muted-foreground mb-6">
                  {course.description}
                </p>
                
                <div className="flex flex-wrap gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    <span><span className="font-medium">Instructor:</span> {course.instructor}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    <span><span className="font-medium">Duration:</span> {course.duration}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-primary" />
                    <span><span className="font-medium">Level:</span> {course.level}</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-1">
                <Card className="shadow-glow sticky top-24">
                  <CardHeader>
                    <CardTitle className="text-center">
                      <div className="text-4xl font-bold text-primary mb-2">
                        {course.priceEUR}
                      </div>
                      <div className="text-2xl text-muted-foreground">
                        {course.priceINR}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button className="w-full gradient-primary text-lg py-6" disabled={enrolling || enrolled}>
                          {enrolled ? "Enrolled" : enrolling ? "Processing..." : "Enroll Now"}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-lg bg-background">
                        <DialogHeader>
                          <DialogTitle>Choose Payment Method</DialogTitle>
                          <DialogDescription>
                            Select your preferred payment method to enroll in {course.title}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 mt-4">
                          {/* Razorpay */}
                          <Card className="p-4 transition-colors cursor-pointer hover:border-primary">
                            <div className="flex items-start gap-3">
                              <CreditCard className="w-6 h-6 text-primary mt-1" />
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-semibold">Pay with Razorpay</h4>
                                  {enrolled && <Badge variant="outline">Enrolled</Badge>}
                                </div>
                                <p className="text-sm text-muted-foreground">{course.priceINR} - Cards, UPI, Netbanking</p>
                                <p className="text-xs text-muted-foreground">Secure checkout powered by Razorpay</p>
                                <Button 
                                  className="w-full mt-3 gradient-primary" 
                                  onClick={() => handleEnroll('razorpay')}
                                  disabled={enrolling || enrolled}
                                >
                                  {enrolled ? "Enrolled" : `Pay ${course.priceINR}`}
                                </Button>
                              </div>
                            </div>
                          </Card>

                          {/* Bank Transfer (India) */}
                          <Card className="p-4 cursor-pointer hover:border-primary transition-colors">
                            <div className="flex items-start gap-3">
                              <Building2 className="w-6 h-6 text-primary mt-1" />
                              <div className="flex-1">
                                <h4 className="font-semibold">Bank Transfer (India)</h4>
                                <p className="text-sm text-muted-foreground mb-3">{course.priceINR} - UPI or NEFT/IMPS</p>
                                <p className="text-xs text-muted-foreground mb-3">
                                  Click below to request enrollment. Bank details will be sent securely to your registered email.
                                </p>
                                <Button 
                                  className="w-full" 
                                  variant="outline"
                                  onClick={() => handleEnroll('bank_transfer')}
                                  disabled={enrolling || enrolled}
                                >
                                  Request Enrollment
                                </Button>
                              </div>
                            </div>
                          </Card>

                          {/* Contact */}
                          <Card className="p-4 bg-muted/30">
                            <div className="flex items-start gap-3">
                              <Mail className="w-6 h-6 text-primary mt-1" />
                              <div>
                                <h4 className="font-semibold">Need Help?</h4>
                                <p className="text-sm text-muted-foreground">Contact us for payment assistance</p>
                                <a 
                                  href="mailto:cloudbee.robotics@gmail.com" 
                                  className="text-sm text-primary hover:underline"
                                >
                                  cloudbee.robotics@gmail.com
                                </a>
                              </div>
                            </div>
                          </Card>
                        </div>
                      </DialogContent>
                    </Dialog>
                    
                    <a href="mailto:cloudbee.robotics@gmail.com">
                      <Button variant="outline" className="w-full">
                        Contact for Details
                      </Button>
                    </a>
                    <p className="text-xs text-center text-muted-foreground">
                      Access to Google Classroom upon enrollment
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Course Content */}
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-12">
                {/* Learning Outcomes */}
                <div>
                  <h2 className="text-3xl font-bold mb-6">What You'll Learn</h2>
                  <div className="grid gap-4">
                    {course.learningOutcomes.map((outcome: string, index: number) => (
                      <div key={index} className="flex items-start gap-3">
                        <CheckCircle2 className="w-6 h-6 text-accent flex-shrink-0 mt-1" />
                        <span className="text-muted-foreground">{outcome}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Topics Covered */}
                <div>
                  <h2 className="text-3xl font-bold mb-6">Topics Covered</h2>
                  <div className="grid md:grid-cols-2 gap-3">
                    {course.topics.map((topic: string, index: number) => (
                      <Card key={index} className="p-4">
                        <p className="font-medium">{topic}</p>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Projects */}
                <div>
                  <h2 className="text-3xl font-bold mb-6">Hands-On Projects</h2>
                  <div className="space-y-3">
                    {course.projects.map((project: string, index: number) => (
                      <Card key={index} className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                            {index + 1}
                          </div>
                          <span className="font-medium">{project}</span>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Guest Lecture (if applicable) */}
                {course.guestLecture && (
                  <div>
                    <Card className="bg-accent/5 border-accent">
                      <CardHeader>
                        <CardTitle>🎁 Bonus: Free Guest Lecture</CardTitle>
                        <CardDescription className="text-base">
                          <div className="font-semibold text-foreground mt-2">
                            {course.guestLecture.title}
                          </div>
                          <div className="text-sm mt-1">
                            by {course.guestLecture.speaker}
                          </div>
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground">
                          {course.guestLecture.description}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div className="lg:col-span-1">
                <Card className="sticky top-24">
                  <CardHeader>
                    <CardTitle>Course Includes</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0 mt-1" />
                      <span className="text-sm">Lifetime access to course materials</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0 mt-1" />
                      <span className="text-sm">Access to Google Classroom</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0 mt-1" />
                      <span className="text-sm">Downloadable resources & lecture recordings</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0 mt-1" />
                      <span className="text-sm">Portfolio-ready projects</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0 mt-1" />
                      <span className="text-sm">Certificate of completion</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0 mt-1" />
                      <span className="text-sm">Direct instructor support</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default CourseDetail;
