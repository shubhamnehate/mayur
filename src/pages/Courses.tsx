import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

const courses = [
  {
    id: "ai-bootcamp",
    title: "AI Bootcamp",
    subtitle: "ML → LLMs → Generative AI",
    description: "Learn machine learning, deep learning, reinforcement learning, and generative AI for robotics and autonomous systems. Includes 5 recruiter-ready projects and portfolio deliverables.",
    priceEUR: "€150",
    priceINR: "₹15,000",
    instructor: "Mayur Waghchoure",
    duration: "12 weeks",
    level: "Intermediate"
  },
  {
    id: "adas-bootcamp",
    title: "ADAS & Autonomous Driving Bootcamp",
    subtitle: "",
    description: "Learn system design, safety (ISO 26262/SOTIF), simulation, and validation for advanced driver assistance systems. Includes lane keeping, fusion, and real-world testing workflows.",
    priceEUR: "€249",
    priceINR: "₹24,999",
    instructor: "Mayur Waghchoure",
    duration: "16 weeks",
    level: "Advanced"
  },
  {
    id: "controls-bootcamp",
    title: "Modern Vehicle Control Bootcamp",
    subtitle: "PID → LQR → MPC",
    description: "Master modern vehicle control techniques for autonomous driving. Learn Linear, Stochastic, and Optimal Control and apply them in real projects like ACC, ESC, and MPC-based trajectory tracking.",
    priceEUR: "€99",
    priceINR: "₹9,999",
    instructor: "Mayur Waghchoure",
    duration: "10 weeks",
    level: "Intermediate"
  },
  {
    id: "motion-planning-bootcamp",
    title: "Motion Prediction & Planning Bootcamp",
    subtitle: "Autonomous Driving",
    description: "Learn how self-driving cars forecast future trajectories and plan safe motion using A*, Frenet/Lattice planners, MPC, and risk-aware decision making (MPDM). Includes 3 hands-on projects + free guest lecture.",
    priceEUR: "€99",
    priceINR: "₹9,999",
    instructor: "Adityaveer Raswan",
    duration: "10 weeks",
    level: "Advanced"
  },
  {
    id: "cicd-bootcamp",
    title: "CI/CD for Autonomous Systems",
    subtitle: "Jenkins · Docker · Kubernetes",
    description: "Learn to automate builds, tests, and deployments for AI and Control projects using GitHub, Jenkins, Docker, and Kubernetes. Build a full DevOps pipeline and deploy a live app to Kubernetes.",
    priceEUR: "€49",
    priceINR: "₹4,999",
    instructor: "Mayur Waghchoure",
    duration: "6 weeks",
    level: "Beginner"
  },
  {
    id: "data-science-bootcamp",
    title: "Data Science Concept Bootcamp",
    subtitle: "",
    description: "Learn the foundations of causal inference, predictive modeling, experimentation, and GenAI data pipelines. Build analytical projects ready for portfolio review.",
    priceEUR: "€50",
    priceINR: "₹5,000",
    instructor: "Mayur Waghchoure",
    duration: "8 weeks",
    level: "Beginner"
  }
];

const Courses = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 px-4 gradient-hero">
          <div className="container mx-auto max-w-6xl text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 animate-fade-in">
              All Bootcamps
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto animate-fade-in">
              Industry-level training for Autonomous Driving, AI, Controls, and Robotics. Learn from experts with 6+ years at Waymo, Siemens, and Waabi.
            </p>
          </div>
        </section>

        {/* Courses Grid */}
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-7xl">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {courses.map((course) => (
                <Card key={course.id} className="flex flex-col shadow-soft hover:shadow-glow transition-smooth hover:scale-105">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <Badge variant="secondary" className="mb-2">
                        {course.level}
                      </Badge>
                      <div className="text-right">
                        <div className="font-bold text-lg text-primary">{course.priceEUR}</div>
                        <div className="text-sm text-muted-foreground">{course.priceINR}</div>
                      </div>
                    </div>
                    <CardTitle className="text-2xl">
                      {course.title}
                    </CardTitle>
                    {course.subtitle && (
                      <CardDescription className="text-base font-medium text-secondary">
                        {course.subtitle}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="flex-1">
                    <p className="text-muted-foreground mb-4">
                      {course.description}
                    </p>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Instructor:</span>
                        <span className="text-muted-foreground">{course.instructor}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Duration:</span>
                        <span className="text-muted-foreground">{course.duration}</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Link to={`/course/${course.id}`} className="w-full">
                      <Button className="w-full gradient-primary">
                        View Details
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Courses;
