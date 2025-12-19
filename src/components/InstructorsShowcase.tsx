import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const instructors = [
  {
    name: "Mayur Waghchoure",
    title: "Autonomous Systems & AI Engineer",
    companies: "Siemens, Deontic",
    experience: "6+ years",
    specialties: [
      "Autonomous Driving",
      "Vehicle Dynamics",
      "Model Predictive Control",
      "Motion Planning",
      "Simulation-based Validation"
    ],
    bio: "Expert in autonomous systems and AI with extensive experience in vehicle dynamics, MPC, hybrid planning, and simulation-based validation for self-driving vehicles."
  },
  {
    name: "Adityaveer Raswan",
    title: "Motion Planning Engineer",
    companies: "Waymo, Waabi",
    experience: "6+ years",
    specialties: [
      "Highway Planning",
      "Interactive MPC",
      "Closed-Loop Simulation",
      "AV Validation",
      "Motion Prediction"
    ],
    bio: "Built highway planners, interactive MPC systems, and closed-loop simulation pipelines used for autonomous vehicle validation at leading self-driving companies."
  },
  {
    name: "Darsh Patel",
    title: "Functional Safety Engineer",
    companies: "Guest Speaker",
    experience: "ISO 26262 / SOTIF Expert",
    specialties: [
      "ISO 26262",
      "SOTIF",
      "Functional Safety",
      "Autonomous Systems",
      "Risk Assessment"
    ],
    bio: "Expert in automotive functional safety for autonomous systems with deep knowledge of ISO 26262 and SOTIF standards."
  }
];

const InstructorsShowcase = () => {
  return (
    <section id="instructors" className="py-20 px-4 bg-muted/30">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Learn from Industry Experts
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Get trained by engineers with real-world experience at top autonomous driving companies
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {instructors.map((instructor) => (
            <Card key={instructor.name} className="shadow-soft hover:shadow-glow transition-smooth">
              <CardHeader>
                <div className="w-20 h-20 gradient-primary rounded-full mb-4 flex items-center justify-center text-3xl font-bold text-white">
                  {instructor.name.split(' ').map(n => n[0]).join('')}
                </div>
                <CardTitle className="text-2xl">{instructor.name}</CardTitle>
                <CardDescription className="text-base">
                  <div className="font-semibold text-foreground">{instructor.title}</div>
                  <div className="text-primary mt-1">{instructor.companies}</div>
                  <div className="text-sm mt-2">{instructor.experience}</div>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  {instructor.bio}
                </p>
                <div className="flex flex-wrap gap-2">
                  {instructor.specialties.map((specialty) => (
                    <Badge key={specialty} variant="secondary" className="text-xs">
                      {specialty}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default InstructorsShowcase;
